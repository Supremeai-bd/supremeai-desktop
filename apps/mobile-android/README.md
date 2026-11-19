# SupremeAI Studio (Android — Unified Edition v2.4.0)

Native **Kotlin + Jetpack Compose** mobile and tablet workstation for **SupremeAI Studio**, unifying the architectures of `supremeAI-apk` and `supremeAI-apk2` into a single **Local-First, Cloud-Optional** Android application.

## Key Capabilities

- **Streaming Multi-Model Chat & Dynamic Route Arbiter**:
  - Real-time SSE streaming via OkHttp against the SupremeAI inference gateway (`https://supremeai-api-ulw0.onrender.com`) with automatic multi-endpoint failover (`/api/v1/stream/chat` → `/v1/chat/completions`) and offline local-first fallback.
  - Supports all 6 SupremeAI foundation routes: `supreme-spark`, `supreme-core`, `supreme-reason`, `supreme-deep`, `supremeai-web`, and `supremeai-api` with `Auto` routing.
- **Bilingual First-Class Support (English, বাংলা & Banglish)**:
  - Instant EN/BN UI switching, heuristic Banglish detection (`detectBengaliOrBanglish`), Bengali system prompt directives, and zero-cost native Android `TextToSpeech` (`bn-BD`/`bn-IN`/`en-US`) + `SpeechRecognizer` voice input.
- **Live Voice Companion & Hologram Avatar**:
  - Animated Canvas orbital voice indicator and holographic avatar (`LiveVoicePanel` & `HologramAvatarCanvas`) reacting to voice listening, speaking, and audio RMS levels, with persona selection (`Zephyr`, `Puck`, `Kore`, `Charon`, `Fenrir`), mic sensitivity, and pitch control.
- **Role Personas, Deep Research & RAG Grounding**:
  - 5 built-in Role Personas + custom system instructions, structured multi-section Deep Research reports, Prompt Library recipes, and local RAG Knowledge Base context injection.
- **Workspace Dock**:
  - Live-synced artifact `Preview` (`WebView` for HTML/SVG/Mermaid), syntax-styled `Code` viewer, integrated sandbox `Browser` (`WebView`), automated `Schedule` task manager, and workspace developer `Terminal`.
- **11 Live Screen Backdrops**:
  - Scenic photography backdrops and animated Compose `Canvas` live themes (`Midnight Peaks` / `Obsidian Peaks`, `Alpine Dunes`, `Misty Fjords`, `Emerald Highlands`, `Amber Canyon`, `Cosmic Nebula`, `Neon Synthwave`, `Aurora Borealis`, `Oceanic Horizon`, `Solar Meadow`, `Cyber Studio`) with Light, Dark, and System modes.
- **Dual-Layer Local-First Persistence (Room SQLite v2 + Atomic JSON)**:
  - Offline storage via Room SQLite v2 (`AppDatabase`, `StudioDaos`, `StudioRepository` with offline session search, cached models, and app metadata) and atomic JSON snapshots (`LocalPersistenceRepository`).
- **User Workspace & 2FA-Gated Admin Studio**:
  - Conversation History, Plan & Usage (Canvas token breakdown chart & top-up bundles), Team, Projects, API Keys & Webhooks, Plugins, plus 2FA/Passkey-gated Admin Studio (MCP Tower cluster probing, Swarm workers, Task Queue/DLQ, Gateway failover, Schema parity, Feature Flags, Customers & Impersonation, Firewall & Audit Log).

## Build & Configuration

- **Framework**: Kotlin 2.2, Jetpack Compose (Material 3), Type-Safe Navigation Compose (`@Serializable` routes), Adaptive `WindowWidthSizeClass` Drawer, Room v2 (KSP), OkHttp SSE, Coil.
- **Target SDK**: Android SDK 36 (`minSdk = 26`, JDK 21).
- **Secrets & Environment**: Managed via `.env` / `.env.example`, the Secrets Gradle Plugin (`BuildConfig`), and `AppConfig`.
