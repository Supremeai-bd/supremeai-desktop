# SupremeAI Frontend (Studio Satellite) Agent Operating Contract

> **Core Operating Doctrine:** "Local-First, Cloud-Optional"  
> **Satellite Charter:** Production Web Workspace, AI Studio UI, Voice Cockpit, and Multi-Provider Chat Client for the SupremeAI Federation ecosystem (`supremeai-studio`).

---

## 1. Architectural Doctrine: Local-First, Cloud-Optional

1. **Zero Hard Cloud Dependency:**
   - Features must prioritize browser-native capabilities, local storage, and client-side processing first.
   - Cloud APIs (e.g., Gemini Live, Cloud TTS, Third-Party inference) are strictly optional enhancements and must **never** be single points of failure.
   - If a cloud service is missing, unauthenticated, rate-limited (429), or cooling down, the application must automatically degrade to local capabilities without crashing or halting the user experience.

2. **Voice & Speech Architecture:**
   - **Tier 1 (Default / Zero-Cost):** Browser Native Web Speech API (`window.speechSynthesis` with bilingual `bn-BD`, `bn-IN`, and `en-US` voice resolution). Operates instantly with zero network latency, zero token cost, and no required API keys.
   - **Tier 2 (Edge Neural):** Open-source and free edge neural voice streaming when available.
   - **Tier 3 (Cloud API / Optional):** Proprietary neural services (e.g., Gemini TTS / Live, ElevenLabs) are utilized only when explicitly configured with valid credentials. System must fail-open to Tier 1 instantly if Tier 3 returns non-200.

3. **State & Offline Persistence:**
   - User settings, language preference (`en` / `bn`), active roles, custom instructions, and local session caches must reside in local storage and persist offline.
   - Do not require active server round-trips for core UI navigation, theme changes, or interface localization.

---

## 2. Federation & Gateway Communication Standards

1. **API Protocol Compliance:**
   - All chat and inference streaming requests must follow standard OpenAI-compatible schemas (`messages` array).
   - **Strict Payload Cleanliness:** Never send conflicting top-level keys (e.g., sending both `prompt` and `messages` simultaneously). Upstream providers such as OpenRouter strictly reject requests containing both.
   - Transmit native model slugs (e.g., `supreme-spark`, `supreme-core`, `supreme-reason`, `supreme-deep`) directly to `/api/v1/stream/chat` or `/v1/chat/completions`. Let the gateway's `DynamicRouteArbiter` handle latency scoring, multi-key squad pools, and cooldown cascades.

2. **Authentication & Session Tokens:**
   - Store session bearer tokens securely. Pass them via `Authorization: Bearer <token>` and `X-SupremeAI-Key`.
   - Support guest mode gracefully: allow instant chat and voice exploration without requiring mandatory login, while gating administrative and settings tools.

---

## 3. Bilingual & Localization (i18n) Contract

1. **Dual Language First-Class Support:**
   - Every user-facing UI element, button, tooltip, modal, and placeholder must be localized in `src/utils/i18n.ts` for both English (`en`) and Bengali (`bn`).
   - Use the `useI18n()` hook uniformly across components. Avoid hardcoding raw English strings in template JSX.

2. **Language Directives for AI Models:**
   - When the user selects Bengali (`bn`), the chat client must inject a clear system instruction:
     > *"Always respond naturally, fluently, and authoritatively in Bengali (বাংলা) by default, keeping code syntax, technical identifiers, and commands in English unless the user explicitly requests another language."*
   - Keep code blocks, technical identifiers (e.g., API, Gateway, PR, Route, Cache, Middleware, CSS classes), and CLI commands in English.

---

## 4. 3D Avatar & Graphics Stability

1. **Isolation & Modularity:**
   - 3D Avatar subsystems (`avatarRigBuilder.ts`, `avatarTextures.ts`, `LiveVoiceAvatarCanvas.tsx`, `hologramAvatar.ts`) must remain strictly modular.
   - **Never couple 3D graphics/texture changes with chat, voice, or localization features.** Changes to visual shaders or meshes must be isolated to their own dedicated commits.

2. **Performance Budget & Low-End Hardware Protection:**
   - Maintain a stable 60 FPS target without unthrottled canvas rerenders or heavy memory allocations.
   - Do not degrade base texture clarity or remove visual features globally without explicit user authorization.
   - Canvas animations must pause or throttle when the avatar panel is closed or the tab is hidden.

---

## 5. Engineering Invariants & Verification Checklist

Before proposing or finalizing any change in `supremeai-frontend`:

1. **Reflect Scope:** Ensure only files directly relevant to the user's assignment are touched. Preserve all unrelated user work and pre-existing features.
2. **Unit Tests:** Execute `npm test` and verify that all vitest unit test suites pass completely.
3. **Production Build:** Execute `npm run build` and ensure the Vite production bundle builds in < 5 seconds with zero compilation errors and zero unresolved imports.
4. **Git Discipline:**
   - Commit changes with clear, standard semantic commit messages (`feat:`, `fix:`, `refactor:`, `revert:`).
   - Always verify git status before and after branch operations. Never discard uncommitted user changes.
