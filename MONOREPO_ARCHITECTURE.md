# SupremeAI Studio — True Single-Source Architecture (Web + Desktop + Android)

All three SupremeAI platforms (**Web**, **Windows/macOS/Linux Desktop**, and **Android APK**) are built from **one single React 19 UI + one Tauri v2 Rust core**, with **zero duplicate UI code** and a unified Real-Time Cross-Device Sync protocol connected to the SupremeAI Gateway (`https://supremeai-api-ulw0.onrender.com`).

## Repository Layout

```text
.
├── src/                         # Single Source of UI & Logic (React 19 + TypeScript + Tailwind v4)
│   │                            # Runs identically on Web, Desktop, and Android!
│   ├── auth/                    # Direct Guest -> Inline Login + Full Auth Modal + Quick-Lock PIN
│   ├── bridge/                  # Hybrid Tauri v2 Rust IPC + Web Gateway SSE bridge
│   ├── companion/               # Articulated Three.js 3D Hologram Companion (Aria / Orion / Custom Photo)
│   ├── components/              # LiveScreenBackdrop (11 Themes), Admin Control Center, 7-Tab WorkspaceDock
│   ├── stores/                  # Zustand 11-theme Live Screen & surface token engine
│   └── sync/                    # Real-Time Cross-Device Sync engine (BroadcastChannel + Gateway SSE/REST)
├── src-tauri/                   # Single Native Core (Rust + Tauri v2) for BOTH Desktop & Android
│   ├── Cargo.toml               # Exports [lib] supremeai_lib (cdylib/staticlib for Android) + [[bin]] desktop
│   ├── tauri.conf.json          # Unified Desktop (NSIS/MSI) + Android (minSdkVersion 26) config
│   └── src/
│       ├── lib.rs               # #[cfg_attr(mobile, tauri::mobile_entry_point)] pub fn run()
│       ├── main.rs              # Thin desktop binary launcher -> supremeai_lib::run()
│       ├── auth.rs              # Persisted user sessions & secure store (Desktop + Android)
│       ├── admin.rs             # Admin control plane commands
│       ├── feedback.rs          # Authenticated feedback bridge
│       └── speech.rs            # Native TTS speech bridge
├── packages/
│   └── contracts/               # Canonical model catalog, 11 theme tokens, and sync protocol schema
├── server.ts                    # Unified Express + Vite Dev / Production Web Server (port 3000)
└── .github/workflows/
    ├── ci.yml                   # 3-platform PR/push gate: Web + Desktop Rust + Tauri Android APK
    └── release-all.yml          # One git push -> Auto-build & release Web + .exe/.msi + signed .apk
```

## Unified Commands

- **Web / App Dev Server**: `npm run dev` (runs on port `3000`)
- **Web Production Build**: `npm run build:web`
- **Shared Native App Bundle (Desktop + Android)**: `npm run build:app`
- **Desktop Dev (Tauri v2)**: `npm run tauri:dev`
- **Desktop Installer Build (.exe / .msi)**: `npm run tauri:build`
- **Android Init (one-time per machine)**: `npm run tauri:android:init`
- **Android Dev (Emulator / USB Device)**: `npm run tauri:android:dev`
- **Android APK Build**: `npm run tauri:android:build`
- **Sync Version Across All Platforms**: `npm run version:sync`

## One Push -> All 3 Platforms Updated

1. Edit anything in `src/` (UI, 3D Companion, Live Themes, Admin Dashboard, Auth, Sync).
2. Commit & `git push origin main` (or push a version tag like `git tag v2.6.0 && git push origin v2.6.0`).
3. GitHub Actions (`release-all.yml`) automatically builds and publishes:
   - **Web Studio** (`supremeai-web-dist.tar.gz` + optional Cloudflare Pages auto-deploy)
   - **Windows Desktop** (`.exe` NSIS + `.msi` installers)
   - **Android APK** (`SupremeAI-Studio-*.apk` built via Tauri v2 + signed with `apksigner`)
