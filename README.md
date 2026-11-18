# SupremeAI Desktop Application

Native **Windows, macOS, and Linux** desktop workstation for **SupremeAI**, built with **Tauri v2 + Rust + React 19 + TypeScript + Three.js**.

[![Desktop CI/CD Release](https://github.com/Supremeai-bd/supremeai-desktop/actions/workflows/desktop-release.yml/badge.svg)](https://github.com/Supremeai-bd/supremeai-desktop/actions/workflows/desktop-release.yml)
[![Latest Release](https://img.shields.io/github/v/release/Supremeai-bd/supremeai-desktop)](https://github.com/Supremeai-bd/supremeai-desktop/releases)

---

## 🌟 Key Capabilities

- **Lightweight & High Performance**:
  - Tauri v2 + Rust runtime ensures tiny binary footprint, near-instant launch, and minimal memory usage compared to Electron.
- **Interactive 3D Holographic Companion**:
  - Three.js powered 3D holographic avatar (`Holographic3D`, `PrismCanvas`) responding dynamically to user status.
- **Voice & Speech Assistant**:
  - Integrated speech synthesis and voice assistant support (`speechHelper`).
- **Unified AI Model Selector**:
  - Instant switching between `Supreme Auto`, `Reasoning Pro`, and `Fast Chat` via the SupremeAI Gateway.
- **Developer Workspace & Admin Studio**:
  - Integrated Code Viewer, Terminal panel, User Authentication, and 2FA-gated Admin Dashboard for MCP Tower and Cluster monitoring.
- **Desktop Native Power**:
  - System Tray integration, Global keyboard shortcuts (`Ctrl+Alt+S` / `Cmd+Alt+S`), and Dark/Light theme switching.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Core Shell & IPC** | Tauri v2 (Rust) |
| **Frontend UI** | React 19, TypeScript, Vite |
| **3D Rendering** | Three.js |
| **Markdown & Formatting** | ReactMarkdown, remark-gfm |
| **Installer Formats** | Windows NSIS (`.exe`), WiX (`.msi`), macOS (`.dmg`), Linux (`.AppImage`) |

---

## 🚀 Development & Build

### Prerequisites
- Node.js (v20+) & npm
- Rust toolchain (latest stable): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Platform C++ build tools (Visual Studio C++ build tools on Windows)

### Commands

```bash
# Install dependencies
npm install

# Start local dev server & Tauri window
npm run tauri:dev

# Typecheck and build frontend
npm run build

# Build production installers (.exe, .msi)
npm run tauri:build
```

---

## 📦 Automated Release Pipeline

GitHub Actions automatically builds and publishes releases:
- **On Tag Push**: Push a tag matching `v*` (e.g., `v0.1.0`) to build production artifacts and create a GitHub Release.
- **Manual Trigger**: Go to **Actions** -> **SupremeAI Desktop Build & Release** -> **Run workflow**, choose whether to create a GitHub Release and specify the version tag.
