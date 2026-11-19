# SupremeAI Studio — Unified Monorepo Architecture

All three SupremeAI client applications (**Web**, **Desktop**, and **Android**) now live in **one unified repository** with shared contracts, identical visual design, and a canonical Real-Time Cross-Device Sync protocol connected to the SupremeAI Gateway (`https://supremeai-api-ulw0.onrender.com`).

## Repository Layout

```text
.
├── src/                         # Unified React 19 + TypeScript + Tailwind v4 Studio UI (Web + Desktop)
│   ├── auth/                    # Direct Guest -> Inline Login + Quick-Lock PIN (preserved desktop UX)
│   ├── bridge/                  # Hybrid Tauri v2 Rust IPC + Web Gateway SSE bridge
│   ├── companion/               # Articulated Three.js 3D Hologram Companion (Aria / Orion / Custom Photo)
│   ├── components/              # LiveScreenBackdrop, ThemeControlPopover, PromptLibraryModal, Plugins, WorkspaceDock
│   ├── stores/                  # Zustand 11-theme Live Screen & surface token engine
│   └── sync/                    # Real-Time Cross-Device Sync engine (BroadcastChannel + Gateway SSE/REST)
├── src-tauri/                   # Native Desktop Shell (Rust + Tauri v2, Windows/macOS/Linux + optional Tauri Mobile)
├── apps/
│   └── mobile-android/          # Native Android App (Kotlin 2.2, Jetpack Compose M3, Room SQLite v2, OkHttp SSE)
│       └── app/src/main/java/com/example/data/RealtimeSyncEngine.kt
├── packages/
│   └── contracts/               # Single Source of Truth across Web, Desktop & Android
│       ├── models.json          # Canonical 6 SupremeAI foundation models & gateway routes
│       ├── themes.json          # Canonical 11 Live Screen theme IDs & accent hex tokens
│       └── sync-protocol.json   # Canonical Real-Time Cross-Device Sync envelope & conflict rules
└── .github/workflows/           # Unified CI/CD for Web, Desktop Installers & Android APK
```

## Unified Commands

- **Web / Desktop Dev Server**: `npm run dev` (runs on port `3000`)
- **Web Production Build**: `npm run build:web`
- **Desktop Dev (Tauri v2 + Rust)**: `npm run tauri:dev`
- **Desktop Installer Build**: `npm run tauri:build`
- **Android Debug APK**: `npm run android:debug`
- **Android Release APK**: `npm run android:release`

## Real-Time Cross-Device Sync Protocol

Web, Desktop (`src/sync/realtimeSync.ts`), and Android (`apps/mobile-android/.../RealtimeSyncEngine.kt`) implement the exact same `packages/contracts/sync-protocol.json` envelope:

- **Domains Synced**: `chats`, `theme`, `roles`, `knowledge`, `plugins`, `voice_avatar`
- **Transport**:
  - Instant local multi-window/tab sync via `BroadcastChannel('supremeai.realtime.sync.v1')`
  - Authenticated cloud real-time sync via `GET/PUT /api/v1/sync/state` and SSE `GET /api/v1/sync/stream`
- **Offline-First Merge**: Deterministic Last-Write-Wins (per-conversation `updatedAt` merge for chats) so all three apps stay fast and functional offline and reconcile automatically once online.
