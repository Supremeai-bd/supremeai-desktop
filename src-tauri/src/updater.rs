use futures_util::StreamExt;
use serde::Serialize;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::time::Duration;
use tauri::{AppHandle, Manager};

const MAX_BINARY_BYTES: u64 = 350 * 1024 * 1024;
const MIN_BINARY_BYTES: u64 = 100 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppRuntimeInfo {
    pub version: String,
    pub os: String,
    pub arch: String,
    pub is_windows: bool,
    pub is_android: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StagedUpdateInfo {
    pub file_path: String,
    pub file_name: String,
    pub size_bytes: u64,
    pub already_cached: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyUpdateResult {
    pub launched: bool,
    pub silent: bool,
    pub mode: String,
    pub message: String,
}

pub fn is_allowed_release_url(url: &str) -> bool {
    let trimmed = url.trim();
    trimmed.starts_with("https://github.com/Supremeai-bd/")
        || trimmed.starts_with("https://supremeai-studio.pages.dev/")
}

pub fn sanitize_file_name(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() || trimmed.len() > 160 || trimmed.contains("..") {
        return Err("Invalid installer file name.".to_string());
    }
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-')
    {
        return Err("Installer file name contains disallowed characters.".to_string());
    }
    let lower = trimmed.to_ascii_lowercase();
    if !(lower.ends_with(".exe") || lower.ends_with(".msi") || lower.ends_with(".apk")) {
        return Err("Only .exe, .msi, or .apk installers can be staged.".to_string());
    }
    Ok(trimmed.to_string())
}

pub fn has_valid_binary_header(file_name: &str, bytes: &[u8]) -> bool {
    let lower = file_name.to_ascii_lowercase();
    if lower.ends_with(".exe") {
        bytes.len() >= 2 && &bytes[..2] == b"MZ"
    } else if lower.ends_with(".apk") {
        bytes.len() >= 2 && &bytes[..2] == b"PK"
    } else if lower.ends_with(".msi") {
        bytes.len() >= 4 && bytes[..4] == [0xD0, 0xCF, 0x11, 0xE0]
    } else {
        false
    }
}

pub fn is_path_inside_updates_dir(updates_dir: &Path, candidate: &Path) -> bool {
    let Ok(canon_dir) = fs::canonicalize(updates_dir) else {
        return false;
    };
    let Ok(canon_candidate) = fs::canonicalize(candidate) else {
        return false;
    };
    canon_candidate.starts_with(&canon_dir) && canon_candidate.is_file()
}

fn updates_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|_| "Could not resolve app cache directory.".to_string())?;
    let dir = cache_dir.join("updates");
    fs::create_dir_all(&dir).map_err(|err| format!("Failed to prepare updates directory: {err}"))?;
    Ok(dir)
}

#[tauri::command]
pub fn get_app_runtime_info(app: AppHandle) -> AppRuntimeInfo {
    AppRuntimeInfo {
        version: app.package_info().version.to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        is_windows: cfg!(target_os = "windows"),
        is_android: cfg!(target_os = "android"),
    }
}

#[tauri::command]
pub async fn stage_silent_update(
    app: AppHandle,
    url: String,
    file_name: String,
) -> Result<StagedUpdateInfo, String> {
    if !is_allowed_release_url(&url) {
        return Err("Update URL is not in the allowlisted SupremeAI release origin.".to_string());
    }
    let clean_name = sanitize_file_name(&file_name)?;
    let dir = updates_dir(&app)?;
    let final_path = dir.join(&clean_name);

    if let Ok(meta) = fs::metadata(&final_path) {
        if meta.len() >= MIN_BINARY_BYTES && meta.len() <= MAX_BINARY_BYTES {
            if let Ok(mut f) = fs::File::open(&final_path) {
                let mut header = [0u8; 4];
                if let Ok(n) = f.read(&mut header) {
                    if has_valid_binary_header(&clean_name, &header[..n]) {
                        return Ok(StagedUpdateInfo {
                            file_path: final_path.to_string_lossy().to_string(),
                            file_name: clean_name,
                            size_bytes: meta.len(),
                            already_cached: true,
                        });
                    }
                }
            }
        }
        let _ = fs::remove_file(&final_path);
    }

    let client = reqwest::Client::builder()
        .https_only(true)
        .timeout(Duration::from_secs(180))
        .user_agent("SupremeAI-Silent-Updater/2.5")
        .build()
        .map_err(|_| "Could not initialize HTTPS update client.".to_string())?;

    let response = client
        .get(url.trim())
        .send()
        .await
        .map_err(|err| format!("Failed to reach release mirror: {err}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "Release download returned HTTP {}.",
            response.status().as_u16()
        ));
    }

    let part_path = dir.join(format!("{clean_name}.part"));
    let mut part_file =
        fs::File::create(&part_path).map_err(|err| format!("Failed to open cache file: {err}"))?;

    let mut stream = response.bytes_stream();
    let mut total_bytes: u64 = 0;
    let mut header_checked = false;
    let mut header_buf: Vec<u8> = Vec::with_capacity(4);

    while let Some(chunk_res) = stream.next().await {
        let chunk = match chunk_res {
            Ok(bytes) => bytes,
            Err(err) => {
                let _ = fs::remove_file(&part_path);
                return Err(format!("Background download interrupted: {err}"));
            }
        };

        if !header_checked {
            let needed = 4usize.saturating_sub(header_buf.len());
            header_buf.extend_from_slice(&chunk[..chunk.len().min(needed)]);
            if header_buf.len() >= 2 {
                if !has_valid_binary_header(&clean_name, &header_buf) {
                    let _ = fs::remove_file(&part_path);
                    return Err("Downloaded payload failed installer magic-byte check.".to_string());
                }
                header_checked = true;
            }
        }

        total_bytes = total_bytes.saturating_add(chunk.len() as u64);
        if total_bytes > MAX_BINARY_BYTES {
            let _ = fs::remove_file(&part_path);
            return Err("Downloaded installer exceeds maximum allowed package size.".to_string());
        }

        if let Err(err) = part_file.write_all(&chunk) {
            let _ = fs::remove_file(&part_path);
            return Err(format!("Failed writing update chunk: {err}"));
        }
    }

    drop(part_file);

    if total_bytes < MIN_BINARY_BYTES {
        let _ = fs::remove_file(&part_path);
        return Err("Downloaded installer is unexpectedly small or incomplete.".to_string());
    }

    if final_path.exists() {
        let _ = fs::remove_file(&final_path);
    }
    fs::rename(&part_path, &final_path)
        .map_err(|err| format!("Failed to finalize staged installer: {err}"))?;

    Ok(StagedUpdateInfo {
        file_path: final_path.to_string_lossy().to_string(),
        file_name: clean_name,
        size_bytes: total_bytes,
        already_cached: false,
    })
}

#[tauri::command]
pub async fn apply_staged_update(
    app: AppHandle,
    file_path: String,
) -> Result<ApplyUpdateResult, String> {
    let dir = updates_dir(&app)?;
    let candidate = PathBuf::from(file_path.trim());
    if !is_path_inside_updates_dir(&dir, &candidate) {
        return Err("Staged installer path is invalid or outside the updates cache.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;

        let path_str = candidate.to_string_lossy().to_string();
        let lower = path_str.to_ascii_lowercase();
        let escaped_ps_path = path_str.replace('\'', "''");

        let ps_script = if lower.ends_with(".exe") {
            format!(
                "Start-Sleep -Milliseconds 650; Start-Process -FilePath '{escaped_ps_path}' -ArgumentList '/S'"
            )
        } else if lower.ends_with(".msi") {
            format!(
                "Start-Sleep -Milliseconds 650; Start-Process -FilePath 'msiexec.exe' -ArgumentList '/i','{escaped_ps_path}','/qn','/norestart'"
            )
        } else {
            return Err("Unsupported Windows update package type.".to_string());
        };

        std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-WindowStyle",
                "Hidden",
                "-Command",
                &ps_script,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|err| format!("Could not launch silent Windows installer: {err}"))?;

        let app_handle = app.clone();
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(250));
            app_handle.exit(0);
        });

        return Ok(ApplyUpdateResult {
            launched: true,
            silent: true,
            mode: "nsis-silent".to_string(),
            message: "Applying cached silent update now. SupremeAI Desktop will finish updating in seconds.".to_string(),
        });
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        let mode = if cfg!(target_os = "android") {
            "android-package"
        } else {
            "manual-package"
        };
        Ok(ApplyUpdateResult {
            launched: false,
            silent: false,
            mode: mode.to_string(),
            message: "Update package verified. Android OS requires one confirmation tap on the APK installer prompt.".to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::{has_valid_binary_header, is_allowed_release_url, sanitize_file_name};

    #[test]
    fn allowlists_only_supremeai_origins() {
        assert!(is_allowed_release_url(
            "https://github.com/Supremeai-bd/supremeai-public/releases/download/latest/SupremeAI.Desktop_2.5.0_x64-setup.exe"
        ));
        assert!(is_allowed_release_url(
            "https://supremeai-studio.pages.dev/downloads/app.apk"
        ));
        assert!(!is_allowed_release_url("https://evil.example.com/payload.exe"));
        assert!(!is_allowed_release_url("http://github.com/Supremeai-bd/test.exe"));
    }

    #[test]
    fn rejects_unsafe_file_names() {
        assert!(sanitize_file_name("SupremeAI.Desktop_2.5.0_x64-setup.exe").is_ok());
        assert!(sanitize_file_name("SupremeAI-Studio-app-universal-release.apk").is_ok());
        assert!(sanitize_file_name("../evil.exe").is_err());
        assert!(sanitize_file_name("sub/file.exe").is_err());
        assert!(sanitize_file_name("payload.ps1").is_err());
    }

    #[test]
    fn validates_installer_magic_bytes() {
        assert!(has_valid_binary_header("setup.exe", b"MZ\x90\x00"));
        assert!(!has_valid_binary_header("setup.exe", b"<htm"));
        assert!(has_valid_binary_header("app.apk", b"PK\x03\x04"));
        assert!(!has_valid_binary_header("app.apk", b"<!DO"));
    }
}
