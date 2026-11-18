// Neural speech synthesis for the desktop app.
//
// Why this lives in Rust instead of the WebView: the WebView's own
// `speechSynthesis` only knows the OS voices (often English-only on Windows,
// which is why Bengali replies used to be skipped or read with an English
// accent). The gateway exposes the same edge-tts neural voices the web app
// uses at `POST /api/tts/edge`, and calling it from Rust avoids CORS entirely.
//
// Contract (gateway/service/frontend_compat.py):
//   request : { "text": "...", "voice": "bn-BD-NabanitaNeural" }
//   response: raw audio/mpeg bytes
//
// We hand the WebView base64 so it can play the audio through an <audio> blob
// without another network hop.

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine as _;
use serde::Serialize;
use std::time::Duration;

const DEFAULT_GATEWAY: &str = "https://supremeai-api-ulw0.onrender.com";
/// One chunk of speech; the client splits at ~220 chars, so this is headroom.
const MAX_TEXT_CHARS: usize = 1_200;
const MAX_AUDIO_BYTES: usize = 8 * 1024 * 1024;

/// Allow-listed edge-tts voices — mirrors EDGE_VOICES in src/companion/speechUtils.ts.
/// Validating here keeps arbitrary provider strings out of the TTS bridge.
const ALLOWED_VOICES: [&str; 6] = [
    "bn-BD-NabanitaNeural",
    "bn-BD-PradeepNeural",
    "bn-IN-TanishaaNeural",
    "bn-IN-BashkarNeural",
    "en-US-AvaMultilingualNeural",
    "en-US-AndrewMultilingualNeural",
];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeechAudio {
    audio_base64: String,
    mime_type: String,
}

fn validate(text: &str, voice: &str) -> Result<(), String> {
    if text.is_empty() {
        return Err("Nothing to speak.".to_string());
    }
    if text.chars().count() > MAX_TEXT_CHARS {
        return Err("Speech chunk is too long.".to_string());
    }
    if text.chars().any(char::is_control) {
        return Err("Speech text contains control characters.".to_string());
    }
    if !ALLOWED_VOICES.contains(&voice) {
        return Err("Unsupported voice.".to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn synthesize_speech(text: String, voice: Option<String>) -> Result<SpeechAudio, String> {
    let text = text.trim().to_string();
    let voice = voice.unwrap_or_else(|| "en-US-AvaMultilingualNeural".to_string());
    validate(&text, &voice)?;

    let base = std::env::var("SUPREMEAI_API_URL").unwrap_or_else(|_| DEFAULT_GATEWAY.to_string());
    let base = base.trim().trim_end_matches('/').to_string();
    if !base.starts_with("https://") {
        return Err("The SupremeAI Gateway endpoint must use HTTPS.".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(25))
        .build()
        .map_err(|_| "Could not initialize the voice connection.".to_string())?;

    let response = client
        .post(format!("{base}/api/tts/edge"))
        .json(&serde_json::json!({ "text": text, "voice": voice }))
        .send()
        .await
        .map_err(|error| {
            if error.is_timeout() {
                "The voice service timed out.".to_string()
            } else {
                "The voice service could not be reached.".to_string()
            }
        })?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("The voice service returned HTTP {status}."));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|_| "The voice service returned unreadable audio.".to_string())?;

    if bytes.is_empty() {
        return Err("The voice service returned no audio.".to_string());
    }
    if bytes.len() > MAX_AUDIO_BYTES {
        return Err("The synthesized audio was unexpectedly large.".to_string());
    }

    Ok(SpeechAudio {
        audio_base64: BASE64.encode(bytes),
        mime_type: "audio/mpeg".to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::{validate, ALLOWED_VOICES};

    #[test]
    fn accepts_every_allowlisted_voice() {
        for voice in ALLOWED_VOICES {
            assert!(validate("hello", voice).is_ok(), "{voice} should be allowed");
        }
    }

    #[test]
    fn rejects_unknown_voices_and_oversized_chunks() {
        assert!(validate("hello", "en-US-EvilNeural").is_err());
        assert!(validate("hello", "").is_err());
        assert!(validate("", "en-US-AvaMultilingualNeural").is_err());
        let huge = "ক".repeat(1_201);
        assert!(validate(&huge, "bn-BD-NabanitaNeural").is_err());
    }

    #[test]
    fn rejects_control_characters() {
        assert!(validate("hello\u{0}world", "en-US-AvaMultilingualNeural").is_err());
    }
}
