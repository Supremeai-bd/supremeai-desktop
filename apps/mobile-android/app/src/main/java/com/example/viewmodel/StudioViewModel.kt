package com.example.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.*
import com.example.domain.ChatIntentEngine
import com.example.model.*
import com.example.voice.VoiceCompanionManager
import com.example.voice.VoiceStatus
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class StudioViewModel(application: Application) : AndroidViewModel(application) {
    private val persistence = LocalPersistenceRepository(application)
    private val apiClient = SupremeApiClient()
    val voiceManager = VoiceCompanionManager(application)

    private val _uiState = MutableStateFlow(StudioUiState())
    val uiState: StateFlow<StudioUiState> = _uiState.asStateFlow()

    val voiceStatus: StateFlow<VoiceStatus> = voiceManager.status
    val voiceInputLevel: StateFlow<Float> = voiceManager.inputLevel
    val voiceOutputLevel: StateFlow<Float> = voiceManager.outputLevel
    val voiceTranscript: StateFlow<String> = voiceManager.lastTranscript

    private var streamJob: Job? = null

    init {
        hydrateInitialState()
    }

    private fun hydrateInitialState() {
        viewModelScope.launch {
            val sessions = persistence.loadSessions()
            val settings = persistence.loadSettings()
            val auth = persistence.loadAuth()
            val workspace = persistence.loadWorkspace()
            val admin = persistence.loadAdmin()

            val activeSession = sessions.first()
            val activeModel = SeedCatalog.MODELS.firstOrNull { it.id == settings.defaultModel }
                ?: SeedCatalog.MODELS.first()
            val activeRole = SeedCatalog.ROLES.firstOrNull { it.id == activeSession.roleId }
                ?: SeedCatalog.ROLES.first()

            voiceManager.updateSettings(settings.language, settings.voicePitch)

            _uiState.update {
                it.copy(
                    isInitialized = true,
                    sessions = sessions,
                    activeSessionId = activeSession.id,
                    activeModel = activeModel,
                    activeRole = activeRole,
                    customInstruction = settings.customInstructions,
                    authUser = auth.authUser,
                    accessToken = auth.accessToken,
                    currentRole = if (auth.authUser?.isAdminEligible == true) auth.currentRole else UserRole.USER,
                    trustedUntilMs = auth.trustedUntilMs,
                    settings = settings,
                    apiKeys = workspace.apiKeys,
                    webhooks = workspace.webhooks,
                    webhookDeliveries = workspace.webhookDeliveries,
                    knowledgeDocs = workspace.knowledgeDocs,
                    teamMembers = workspace.teamMembers,
                    invoices = workspace.invoices,
                    projects = workspace.projects,
                    plugins = workspace.plugins,
                    promptTemplates = workspace.customPrompts,
                    schedules = workspace.schedules,
                    customers = admin.customers,
                    mcpServices = admin.mcpServices,
                    swarmWorkers = admin.swarmWorkers,
                    queueJobs = admin.queueJobs,
                    schemaTables = admin.schemaTables,
                    gatewayRoutes = admin.gatewayRoutes,
                    securityEvents = admin.securityEvents,
                    auditRecords = admin.auditRecords,
                    featureFlags = admin.featureFlags,
                    providerKeys = admin.providerKeys,
                    blockedIps = admin.blockedIps,
                    platformConfig = admin.platformConfig
                )
            }

            if (auth.accessToken.isNullOrBlank()) {
                launch { apiClient.ensureGuestToken() }
            }
        }
    }

    fun clearToast() = _uiState.update { it.copy(toastMessage = null) }
    private fun showToast(msg: String) = _uiState.update { it.copy(toastMessage = msg) }

    // --- Session & Chat Actions ---
    fun selectSession(sessionId: String) {
        _uiState.update { state ->
            val target = state.sessions.firstOrNull { it.id == sessionId }
            val model = target?.let { t -> SeedCatalog.MODELS.firstOrNull { it.id == t.model } } ?: state.activeModel
            val role = target?.let { t -> SeedCatalog.ROLES.firstOrNull { it.id == t.roleId } } ?: state.activeRole
            state.copy(
                activeSessionId = sessionId,
                activeModel = model,
                activeRole = role,
                inferenceError = null
            )
        }
    }

    fun createNewSession() {
        val state = _uiState.value
        val newSession = ChatSession(
            id = "session_${System.currentTimeMillis()}",
            title = "New Conversation",
            model = state.activeModel.id,
            roleId = state.activeRole.id,
            customSystemInstruction = state.customInstruction.ifBlank { null }
        )
        val updated = listOf(newSession) + state.sessions
        _uiState.update {
            it.copy(sessions = updated, activeSessionId = newSession.id, inferenceError = null)
        }
        persistSessions(updated)
    }

    fun deleteSession(sessionId: String) {
        val state = _uiState.value
        val remaining = state.sessions.filterNot { it.id == sessionId }
        val finalSessions = remaining.ifEmpty {
            listOf(
                ChatSession(
                    id = "session_${System.currentTimeMillis()}",
                    title = "New Conversation",
                    model = state.activeModel.id,
                    roleId = state.activeRole.id
                )
            )
        }
        val nextActive = if (state.activeSessionId == sessionId) finalSessions.first().id else state.activeSessionId
        _uiState.update { it.copy(sessions = finalSessions, activeSessionId = nextActive) }
        persistSessions(finalSessions)
        showToast("Conversation removed")
    }

    fun renameSession(sessionId: String, title: String) {
        val clean = title.trim()
        if (clean.isEmpty()) return
        val updated = _uiState.value.sessions.map {
            if (it.id == sessionId) it.copy(title = clean) else it
        }
        _uiState.update { it.copy(sessions = updated) }
        persistSessions(updated)
    }

    fun togglePinSession(sessionId: String) {
        val updated = _uiState.value.sessions.map {
            if (it.id == sessionId) it.copy(isPinned = !it.isPinned) else it
        }
        _uiState.update { it.copy(sessions = updated) }
        persistSessions(updated)
    }

    fun branchSession(sourceSessionId: String? = null, upToMessageId: String? = null) {
        val state = _uiState.value
        val source = state.sessions.firstOrNull { it.id == (sourceSessionId ?: state.activeSessionId) } ?: return
        val inherited = if (upToMessageId != null) {
            val idx = source.messages.indexOfFirst { it.id == upToMessageId }
            if (idx >= 0) source.messages.take(idx + 1) else source.messages
        } else source.messages

        val branch = source.copy(
            id = "branch_${System.currentTimeMillis()}",
            title = "${source.title} (Branch)",
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis(),
            messages = inherited,
            parentSessionId = source.id,
            isPinned = false
        )
        val updated = listOf(branch) + state.sessions
        _uiState.update { it.copy(sessions = updated, activeSessionId = branch.id) }
        persistSessions(updated)
        showToast("Created branch: ${branch.title}")
    }

    fun clearCurrentThread() {
        val state = _uiState.value
        val updated = state.sessions.map {
            if (it.id == state.activeSessionId) it.copy(messages = emptyList(), updatedAt = System.currentTimeMillis()) else it
        }
        _uiState.update { it.copy(sessions = updated, streamingContent = "", inferenceError = null) }
        persistSessions(updated)
        showToast("Conversation cleared")
    }

    fun exportCurrentThread(format: String): String {
        val session = _uiState.value.activeSession ?: return ""
        return when (format) {
            "json" -> kotlinx.serialization.json.Json { prettyPrint = true }.encodeToString(ChatSession.serializer(), session)
            "text" -> buildString {
                appendLine(session.title)
                appendLine("=".repeat(40))
                session.messages.forEach { msg ->
                    val sender = if (msg.role == "user") "You" else (msg.roleName ?: "SupremeAI")
                    appendLine("$sender:\n${msg.content}\n")
                }
            }
            else -> buildString {
                appendLine("# ${session.title}")
                appendLine("*Exported from SupremeAI Studio · Model: ${session.model}*\n")
                session.messages.forEach { msg ->
                    val sender = if (msg.role == "user") "### You" else "### ${msg.roleName ?: "SupremeAI"}"
                    appendLine("$sender\n\n${msg.content}\n\n---\n")
                }
            }
        }
    }

    fun selectModel(model: ModelDetail) {
        _uiState.update { it.copy(activeModel = model) }
        updateSettings { it.copy(autoModelRouting = false, defaultModel = model.id) }
        showToast("Model: ${model.name}")
    }

    fun setAutoModelRouting(enabled: Boolean) {
        updateSettings { it.copy(autoModelRouting = enabled) }
    }

    fun selectRole(role: RolePersona, customPrompt: String? = null) {
        val suggested = SeedCatalog.MODELS.firstOrNull { it.id == role.suggestedModel } ?: _uiState.value.activeModel
        _uiState.update {
            it.copy(
                activeRole = role,
                activeModel = suggested,
                customInstruction = customPrompt ?: it.customInstruction
            )
        }
        showToast("Persona: ${role.name}")
    }

    fun setCustomInstruction(instruction: String) {
        _uiState.update { it.copy(customInstruction = instruction) }
        updateSettings { it.copy(customInstructions = instruction) }
    }

    fun sendMessage(rawText: String, attachment: ChatAttachment? = null) {
        val text = rawText.trim()
        val state = _uiState.value
        if ((text.isEmpty() && attachment == null) || state.isStreaming) return
        val session = state.activeSession ?: return

        val effectiveModel = if (state.settings.autoModelRouting) {
            ChatIntentEngine.resolveAutoModel(
                promptText = text,
                attachment = attachment,
                models = SeedCatalog.MODELS,
                platformConfig = state.platformConfig,
                userTier = state.authUser?.plan ?: state.settings.plan,
                currentRole = state.currentRole,
                fallbackModel = state.activeModel
            )
        } else state.activeModel

        val userMsg = ChatMessage(
            id = "msg_${System.currentTimeMillis()}",
            role = "user",
            content = text.ifEmpty { "Attached ${attachment?.name ?: "file"}" },
            attachment = attachment
        )

        val isFirst = session.messages.none { it.role == "user" }
        val newTitle = if (isFirst && ChatIntentEngine.isDefaultSessionTitle(session.title)) {
            ChatIntentEngine.generateHeuristicChatTitle(text, attachment)
        } else session.title

        val updatedMessages = session.messages + userMsg
        val updatedSessions = state.sessions.map {
            if (it.id == session.id) {
                it.copy(
                    title = newTitle,
                    messages = updatedMessages,
                    updatedAt = System.currentTimeMillis(),
                    model = effectiveModel.id,
                    roleId = state.activeRole.id
                )
            } else it
        }

        val estimatedTokens = (text.length / 4) + (if (attachment != null) 258 else 0) + 120
        val nextSettings = state.settings.copy(monthlyTokensUsed = state.settings.monthlyTokensUsed + estimatedTokens)

        _uiState.update {
            it.copy(
                sessions = updatedSessions,
                activeModel = effectiveModel,
                isStreaming = true,
                streamingContent = "",
                inferenceError = null,
                settings = nextSettings
            )
        }
        persistSessions(updatedSessions)
        viewModelScope.launch { persistence.saveSettings(nextSettings) }

        val isDeepResearch = ChatIntentEngine.shouldAutoTriggerDeepResearch(text, attachment)
        val groundingDocs = ChatIntentEngine.resolveAutoGroundingDocs(
            promptText = text,
            docs = state.knowledgeDocs,
            enableKnowledgeGrounding = state.enableKnowledgeGrounding
        )
        val groundingText = if (groundingDocs.isNotEmpty()) {
            groundingDocs.joinToString("\n\n") { "[GROUNDING: ${it.title}]\n${it.contentPreview}" }
        } else null

        // Schedule intent check
        ChatIntentEngine.parseScheduleFromPrompt(text, state.workspaceDock.browserUrl)?.let { newSched ->
            val nextSchedules = listOf(newSched) + _uiState.value.schedules
            _uiState.update { it.copy(schedules = nextSchedules) }
            persistWorkspace()
            showToast("Scheduled: ${newSched.title}")
        }

        // Browser navigation intent check
        val browserIntentUrl = ChatIntentEngine.detectBrowserNavigationIntent(text)
        if (browserIntentUrl != null && !state.isGuest) {
            navigateBrowser(browserIntentUrl, openDock = true)
        }

        streamJob?.cancel()
        streamJob = viewModelScope.launch {
            if (isDeepResearch) {
                _uiState.update { it.copy(streamingContent = "Initializing Deep Research pipeline...\nSynthesizing multi-source empirical intelligence...") }
                val report = apiClient.executeDeepResearch(text, state.settings.language, state.accessToken)
                val assistantMsg = ChatMessage(
                    id = "msg_${System.currentTimeMillis()}",
                    role = "assistant",
                    content = "### Deep Research Analysis: ${report.title}\n\n${report.summary}",
                    model = effectiveModel.id,
                    roleName = "Deep Researcher",
                    researchReport = report
                )
                commitAssistantMessage(session.id, assistantMsg)
                return@launch
            }

            val baseInstruction = state.customInstruction.ifBlank {
                state.settings.customInstructions.ifBlank { state.activeRole.systemInstruction }
            }
            val studioGuidance = "\n\n[AUTO-STUDIO WORKSPACE]\nWhen the user asks to build, design, or modify a UI, web app, chart, or script, output complete self-contained runnable code inside one primary fenced code block (`html`, `tsx`, `mermaid`, or `kotlin`)."
            val effectiveInstruction = baseInstruction + studioGuidance

            val accumulated = StringBuilder()
            try {
                apiClient.streamChat(
                    modelId = effectiveModel.id,
                    sessionId = session.id,
                    messages = updatedMessages,
                    systemInstruction = effectiveInstruction,
                    groundingContext = groundingText,
                    language = state.settings.language,
                    accessToken = state.accessToken,
                    userEmail = state.authUser?.email ?: state.settings.email,
                    userRole = state.currentRole,
                    userTier = state.authUser?.plan ?: state.settings.plan
                ).collect { chunk ->
                    accumulated.append(chunk)
                    val snapshot = accumulated.toString()
                    _uiState.update { it.copy(streamingContent = snapshot) }
                    syncArtifactIfEnabled(snapshot, isFinal = false)
                }

                val finalContent = accumulated.toString()
                syncArtifactIfEnabled(finalContent, isFinal = true)
                val browserMeta = browserIntentUrl?.let { url ->
                    BrowserNavigationMetadata(
                        url = url,
                        hostname = runCatching { java.net.URI(url).host ?: url }.getOrDefault(url),
                        title = _uiState.value.workspaceDock.browserTitle
                    )
                }
                val assistantMsg = ChatMessage(
                    id = "msg_${System.currentTimeMillis()}",
                    role = "assistant",
                    content = finalContent,
                    model = effectiveModel.id,
                    roleName = state.activeRole.name,
                    browserNavigation = browserMeta
                )
                commitAssistantMessage(session.id, assistantMsg)
                if (_uiState.value.isLiveVoiceOpen) {
                    voiceManager.speak(finalContent, _uiState.value.settings.language)
                }
            } catch (t: Throwable) {
                val partial = accumulated.toString()
                if (partial.isNotBlank()) {
                    commitAssistantMessage(
                        session.id,
                        ChatMessage(
                            id = "msg_${System.currentTimeMillis()}",
                            role = "assistant",
                            content = partial,
                            model = effectiveModel.id,
                            roleName = state.activeRole.name
                        )
                    )
                } else {
                    _uiState.update {
                        it.copy(
                            isStreaming = false,
                            streamingContent = "",
                            inferenceError = t.message ?: "Unable to reach SupremeAI inference gateway."
                        )
                    }
                }
            }
        }
    }

    private fun commitAssistantMessage(sessionId: String, assistantMsg: ChatMessage) {
        val updated = _uiState.value.sessions.map {
            if (it.id == sessionId) {
                it.copy(messages = it.messages + assistantMsg, updatedAt = System.currentTimeMillis())
            } else it
        }
        _uiState.update {
            it.copy(
                sessions = updated,
                isStreaming = false,
                streamingContent = "",
                workspaceDock = it.workspaceDock.copy(isArtifactStreaming = false)
            )
        }
        persistSessions(updated)
    }

    fun stopStreaming() {
        streamJob?.cancel()
        streamJob = null
        val partial = _uiState.value.streamingContent.trim()
        val sessionId = _uiState.value.activeSessionId
        if (partial.isNotEmpty()) {
            commitAssistantMessage(
                sessionId,
                ChatMessage(
                    id = "msg_${System.currentTimeMillis()}",
                    role = "assistant",
                    content = partial,
                    model = _uiState.value.activeModel.id,
                    roleName = _uiState.value.activeRole.name
                )
            )
        } else {
            _uiState.update {
                it.copy(
                    isStreaming = false,
                    streamingContent = "",
                    workspaceDock = it.workspaceDock.copy(isArtifactStreaming = false)
                )
            }
        }
        showToast("Generation stopped")
    }

    private fun syncArtifactIfEnabled(markdown: String, isFinal: Boolean) {
        val state = _uiState.value
        if (!state.workspaceDock.liveArtifactSync) return
        val artifact = ChatIntentEngine.extractStreamingArtifact(markdown) ?: return
        val targetTab = if (artifact.targetTab == "preview") WorkspaceDockTab.PREVIEW else WorkspaceDockTab.CODE
        _uiState.update {
            it.copy(
                workspaceDock = it.workspaceDock.copy(
                    artifactCode = artifact.code,
                    artifactLanguage = artifact.lang,
                    activeTab = targetTab,
                    isArtifactStreaming = !isFinal,
                    isOpen = if (!state.isGuest && isFinal) it.workspaceDock.isOpen else it.workspaceDock.isOpen
                )
            )
        }
    }

    // --- Voice Companion ---
    fun toggleLiveVoice() {
        val next = !_uiState.value.isLiveVoiceOpen
        _uiState.update { it.copy(isLiveVoiceOpen = next) }
        if (!next) {
            voiceManager.stopListening()
            voiceManager.stopSpeaking()
        }
    }

    fun startVoiceListening() {
        voiceManager.startListening(_uiState.value.settings.language) { spokenText ->
            sendMessage(spokenText)
        }
    }

    fun speakText(text: String) {
        voiceManager.speak(text, _uiState.value.settings.language)
    }

    fun updateVoicePitch(pitch: Float) {
        updateSettings { it.copy(voicePitch = pitch) }
        voiceManager.updateSettings(_uiState.value.settings.language, pitch)
    }

    fun updateMicSensitivity(gain: Float) {
        updateSettings { it.copy(micSensitivity = gain) }
    }

    // --- Auth & Role Switching ---
    fun openAuthModal(reason: String? = null) {
        _uiState.update { it.copy(showAuthModal = true, authPromptReason = reason, authError = null) }
    }

    fun closeAuthModal() {
        _uiState.update { it.copy(showAuthModal = false, authPromptReason = null, authError = null) }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isAuthLoading = true, authError = null) }
            val result = apiClient.login(email, password)
            result.onSuccess { (user, token) ->
                val planSpec = SeedCatalog.PLANS[user.plan] ?: SeedCatalog.PLANS.getValue(PlanTier.FREE)
                val nextSettings = _uiState.value.settings.copy(
                    name = user.name,
                    email = user.email,
                    plan = user.plan,
                    monthlyTokensLimit = planSpec.monthlyTokensLimit
                )
                val role = if (user.isAdminEligible) user.role else UserRole.USER
                _uiState.update {
                    it.copy(
                        authUser = user,
                        accessToken = token,
                        currentRole = role,
                        settings = nextSettings,
                        isAuthLoading = false,
                        showAuthModal = false,
                        authPromptReason = null
                    )
                }
                persistence.saveAuth(PersistedAuthBundle(user, token, role, _uiState.value.trustedUntilMs))
                persistence.saveSettings(nextSettings)
                showToast("Welcome back, ${user.name}!")
            }.onFailure { err ->
                _uiState.update { it.copy(isAuthLoading = false, authError = err.message ?: "Sign in failed") }
            }
        }
    }

    fun signup(name: String, email: String, password: String, plan: PlanTier = PlanTier.FREE) {
        viewModelScope.launch {
            _uiState.update { it.copy(isAuthLoading = true, authError = null) }
            val result = apiClient.register(name, email, password, plan)
            result.onSuccess { (user, token) ->
                val planSpec = SeedCatalog.PLANS[user.plan] ?: SeedCatalog.PLANS.getValue(PlanTier.FREE)
                val nextSettings = _uiState.value.settings.copy(
                    name = user.name,
                    email = user.email,
                    plan = user.plan,
                    monthlyTokensLimit = planSpec.monthlyTokensLimit
                )
                _uiState.update {
                    it.copy(
                        authUser = user,
                        accessToken = token,
                        currentRole = UserRole.USER,
                        settings = nextSettings,
                        isAuthLoading = false,
                        showAuthModal = false,
                        authPromptReason = null
                    )
                }
                persistence.saveAuth(PersistedAuthBundle(user, token, UserRole.USER, _uiState.value.trustedUntilMs))
                persistence.saveSettings(nextSettings)
                showToast("Account created for ${user.name}")
            }.onFailure { err ->
                _uiState.update { it.copy(isAuthLoading = false, authError = err.message ?: "Registration failed") }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            val fresh = ChatSession(
                id = "session_${System.currentTimeMillis()}",
                title = "SupremeAI Chat",
                model = "supreme-spark",
                roleId = SeedCatalog.ROLES.first().id
            )
            persistence.saveAuth(PersistedAuthBundle())
            persistence.saveSessions(listOf(fresh))
            _uiState.update {
                it.copy(
                    authUser = null,
                    accessToken = null,
                    currentRole = UserRole.USER,
                    impersonatedCustomer = null,
                    originalAdminUser = null,
                    sessions = listOf(fresh),
                    activeSessionId = fresh.id,
                    workspaceDock = it.workspaceDock.copy(isOpen = false)
                )
            }
            showToast("Signed out safely")
            apiClient.ensureGuestToken(forceRefresh = true)
        }
    }

    fun toggleAdminRole(forcedRole: UserRole? = null) {
        val state = _uiState.value
        val target = forcedRole ?: if (state.currentRole == UserRole.ADMIN) UserRole.USER else UserRole.ADMIN
        if (target == UserRole.ADMIN) {
            if (!state.isAdminEligible) {
                showToast("Admin access requires an authorized administrator account")
                return
            }
            val isTrusted = state.trustedUntilMs != null && state.trustedUntilMs > System.currentTimeMillis()
            if (!isTrusted) {
                _uiState.update { it.copy(showTwoFactorModal = true) }
                return
            }
        }
        _uiState.update { it.copy(currentRole = target) }
        viewModelScope.launch {
            persistence.saveAuth(PersistedAuthBundle(state.authUser, state.accessToken, target, state.trustedUntilMs))
        }
        showToast(if (target == UserRole.ADMIN) "Admin Studio active" else "Switched to User Mode")
    }

    fun verify2FA(code: String, trust7Days: Boolean): Boolean {
        val clean = code.trim()
        if (!com.example.config.AppConfig.matchesAdminPasskey(clean)) return false
        val trustedUntil = if (trust7Days) System.currentTimeMillis() + 7L * 24 * 3600 * 1000L else null
        _uiState.update {
            it.copy(
                currentRole = UserRole.ADMIN,
                trustedUntilMs = trustedUntil,
                showTwoFactorModal = false
            )
        }
        val state = _uiState.value
        viewModelScope.launch {
            persistence.saveAuth(PersistedAuthBundle(state.authUser, state.accessToken, UserRole.ADMIN, trustedUntil))
        }
        showToast("2FA verified · Admin Studio unlocked")
        return true
    }

    fun dismissTwoFactorModal() = _uiState.update { it.copy(showTwoFactorModal = false) }

    fun toggleDeveloperMode() {
        if (!_uiState.value.isDeveloperEligible) return
        val next = !_uiState.value.settings.developerMode
        updateSettings { it.copy(developerMode = next) }
        showToast(if (next) "Developer Mode enabled" else "Standard Mode active")
    }

    fun setDeveloperEligibility(eligible: Boolean) {
        val user = _uiState.value.authUser ?: return
        val updatedUser = user.copy(isDeveloperEligible = eligible)
        _uiState.update {
            it.copy(
                authUser = updatedUser,
                settings = if (!eligible) it.settings.copy(developerMode = false) else it.settings
            )
        }
        viewModelScope.launch {
            persistence.saveAuth(PersistedAuthBundle(updatedUser, _uiState.value.accessToken, _uiState.value.currentRole, _uiState.value.trustedUntilMs))
        }
    }

    // --- Settings & Appearance ---
    fun updateSettings(transform: (UserAccountSettings) -> UserAccountSettings) {
        val next = transform(_uiState.value.settings)
        _uiState.update { it.copy(settings = next) }
        voiceManager.updateSettings(next.language, next.voicePitch)
        viewModelScope.launch { persistence.saveSettings(next) }
    }

    fun toggleLanguage() {
        val next = if (_uiState.value.settings.language == AppLanguage.EN) AppLanguage.BN else AppLanguage.EN
        updateSettings { it.copy(language = next) }
        showToast(if (next == AppLanguage.BN) "ভাষা: বাংলা" else "Language: English")
    }

    fun cycleThemeMode() {
        val next = when (_uiState.value.settings.themeMode) {
            ThemeMode.SYSTEM -> ThemeMode.DARK
            ThemeMode.DARK -> ThemeMode.LIGHT
            ThemeMode.LIGHT -> ThemeMode.SYSTEM
        }
        updateSettings { it.copy(themeMode = next) }
    }

    // --- Modals & Prompt Insertion ---
    fun setPromptLibraryOpen(open: Boolean) = _uiState.update { it.copy(showPromptLibraryModal = open) }
    fun setRoleModalOpen(open: Boolean) = _uiState.update { it.copy(showRoleModal = open) }
    fun insertPromptText(text: String) = _uiState.update { it.copy(pendingInputInsertion = text) }
    fun consumePendingInputInsertion() = _uiState.update { it.copy(pendingInputInsertion = null) }

    // --- Workspace Dock ---
    fun toggleWorkspaceDock(tab: WorkspaceDockTab? = null) {
        _uiState.update {
            val open = if (tab != null) true else !it.workspaceDock.isOpen
            it.copy(workspaceDock = it.workspaceDock.copy(isOpen = open, activeTab = tab ?: it.workspaceDock.activeTab))
        }
    }

    fun closeWorkspaceDock() {
        _uiState.update { it.copy(workspaceDock = it.workspaceDock.copy(isOpen = false)) }
    }

    fun selectDockTab(tab: WorkspaceDockTab) {
        _uiState.update { it.copy(workspaceDock = it.workspaceDock.copy(activeTab = tab)) }
    }

    fun openCodeInWorkspace(code: String, lang: String) {
        val target = if (lang.lowercase() in setOf("html", "svg", "mermaid")) WorkspaceDockTab.PREVIEW else WorkspaceDockTab.CODE
        _uiState.update {
            it.copy(
                workspaceDock = it.workspaceDock.copy(
                    isOpen = true,
                    activeTab = target,
                    artifactCode = code,
                    artifactLanguage = lang
                )
            )
        }
    }

    fun navigateBrowser(rawUrl: String, openDock: Boolean = false) {
        val normalized = ChatIntentEngine.normalizeProxyInputUrl(rawUrl)
        if (normalized.isBlank()) return
        _uiState.update {
            it.copy(
                workspaceDock = it.workspaceDock.copy(
                    isOpen = if (openDock) true else it.workspaceDock.isOpen,
                    activeTab = if (openDock) WorkspaceDockTab.BROWSER else it.workspaceDock.activeTab,
                    browserUrl = normalized,
                    browserTitle = normalized.removePrefix("https://").removePrefix("http://").substringBefore("/"),
                    browserHistory = (it.workspaceDock.browserHistory + normalized).distinct().takeLast(12)
                )
            )
        }
    }

    fun appendTerminalLog(command: String) {
        val clean = command.trim()
        if (clean.isEmpty()) return
        val output = when {
            clean == "clear" -> emptyList()
            clean.startsWith("help") -> listOf("$ $clean", "Commands: status, models, probe, clear")
            clean == "models" -> listOf("$ $clean") + SeedCatalog.MODELS.map { " • ${it.id} (${it.latencyRating})" }
            clean == "probe" -> listOf("$ $clean", "Probing ${SeedCatalog.DEFAULT_API_BASE_URL} -> 200 OK")
            else -> listOf("$ $clean", "Executed cleanly in workspace sandbox.")
        }
        _uiState.update {
            val nextLogs = if (clean == "clear") emptyList() else (it.workspaceDock.terminalLogs + output).takeLast(40)
            it.copy(workspaceDock = it.workspaceDock.copy(terminalLogs = nextLogs))
        }
    }

    // --- Workspace CRUD ---
    fun addApiKey(name: String, provider: String, rawSecret: String) {
        val prefix = rawSecret.trim().take(10).ifEmpty { "sk-sup-new" }
        val item = ApiKeyItem(
            id = "key_${System.currentTimeMillis()}",
            name = name.trim(),
            provider = provider,
            keyPrefix = prefix,
            secretMasked = "${prefix}••••••••${rawSecret.takeLast(4)}",
            createdAt = "Today",
            lastUsed = "Just now",
            rateLimitRpm = 240,
            status = "active"
        )
        _uiState.update { it.copy(apiKeys = listOf(item) + it.apiKeys) }
        persistWorkspace()
        showToast("API key configured")
    }

    fun revokeApiKey(id: String) {
        _uiState.update { it.copy(apiKeys = it.apiKeys.map { k -> if (k.id == id) k.copy(status = "revoked") else k }) }
        persistWorkspace()
    }

    fun deleteApiKey(id: String) {
        _uiState.update { it.copy(apiKeys = it.apiKeys.filterNot { k -> k.id == id }) }
        persistWorkspace()
    }

    fun addWebhook(name: String, url: String, events: List<String>) {
        val wh = WebhookItem("wh_${System.currentTimeMillis()}", name, url, events, "whsec_${System.currentTimeMillis() % 99999}", true, "Never", 0)
        _uiState.update { it.copy(webhooks = listOf(wh) + it.webhooks) }
        persistWorkspace()
        showToast("Webhook registered")
    }

    fun deleteWebhook(id: String) {
        _uiState.update { it.copy(webhooks = it.webhooks.filterNot { w -> w.id == id }) }
        persistWorkspace()
    }

    fun addKnowledgeDoc(title: String, type: String, content: String) {
        val doc = KnowledgeDoc(
            id = "doc_${System.currentTimeMillis()}",
            title = title.trim(),
            type = type,
            sizeBytes = content.length.toLong(),
            tokenCount = (content.length / 4).coerceAtLeast(10),
            chunkCount = (content.length / 400).coerceAtLeast(1),
            status = "indexed",
            lastIndexed = "Just now",
            isGroundingActive = true,
            contentPreview = content.take(360)
        )
        _uiState.update { it.copy(knowledgeDocs = listOf(doc) + it.knowledgeDocs) }
        persistWorkspace()
        showToast("Document indexed for RAG")
    }

    fun toggleKnowledgeGrounding(id: String) {
        _uiState.update {
            it.copy(knowledgeDocs = it.knowledgeDocs.map { d -> if (d.id == id) d.copy(isGroundingActive = !d.isGroundingActive) else d })
        }
        persistWorkspace()
    }

    fun deleteKnowledgeDoc(id: String) {
        _uiState.update { it.copy(knowledgeDocs = it.knowledgeDocs.filterNot { d -> d.id == id }) }
        persistWorkspace()
    }

    fun inviteTeamMember(name: String, email: String, role: String) {
        val m = TeamMember("mem_${System.currentTimeMillis()}", name, email, name.firstOrNull()?.uppercase() ?: "M", role, "Today", false, "invited")
        _uiState.update { it.copy(teamMembers = it.teamMembers + m) }
        persistWorkspace()
        showToast("Invited $email")
    }

    fun updateTeamRole(id: String, role: String) {
        _uiState.update { it.copy(teamMembers = it.teamMembers.map { m -> if (m.id == id) m.copy(role = role) else m }) }
        persistWorkspace()
    }

    fun removeTeamMember(id: String) {
        _uiState.update { it.copy(teamMembers = it.teamMembers.filterNot { m -> m.id == id }) }
        persistWorkspace()
    }

    fun topUpTokens(pkg: TopUpPackage) {
        val inv = BillingInvoice("top_${System.currentTimeMillis()}", "TOP-${System.currentTimeMillis() % 9999}", "Today", pkg.amountUsd.toDouble(), "paid", "Credits (+${pkg.tokensBonus / 1000}k)")
        updateSettings { it.copy(monthlyTokensLimit = it.monthlyTokensLimit + pkg.tokensBonus) }
        _uiState.update { it.copy(invoices = listOf(inv) + it.invoices) }
        persistWorkspace()
        showToast("Added ${pkg.tokensBonus / 1000}k credits")
    }

    fun addProject(name: String, repoUrl: String, branch: String, desc: String, lang: String) {
        val p = UserProject("proj_${System.currentTimeMillis()}", name, repoUrl, branch, desc, lang, 1, System.currentTimeMillis(), "idle")
        _uiState.update { it.copy(projects = listOf(p) + it.projects) }
        persistWorkspace()
        showToast("Repository connected")
    }

    fun deleteProject(id: String) {
        _uiState.update { it.copy(projects = it.projects.filterNot { p -> p.id == id }) }
        persistWorkspace()
    }

    fun togglePlugin(id: String) {
        _uiState.update { it.copy(plugins = it.plugins.map { p -> if (p.id == id) p.copy(isEnabled = !p.isEnabled) else p }) }
        persistWorkspace()
    }

    fun addCustomPrompt(title: String, category: String, description: String, template: String) {
        val item = PromptTemplateItem("tmpl_${System.currentTimeMillis()}", title, category, description, template, listOf(category))
        _uiState.update { it.copy(promptTemplates = listOf(item) + it.promptTemplates) }
        persistWorkspace()
        showToast("Prompt template saved")
    }

    fun addScheduledTask(title: String, url: String, cadence: String, instruction: String) {
        val cron = when (cadence) {
            "hourly" -> "0 * * * *"
            "weekly" -> "0 9 * * 1"
            else -> "0 8 * * *"
        }
        val task = ScheduledTaskItem("sched_${System.currentTimeMillis()}", title, url, cadence, cron, instruction)
        _uiState.update { it.copy(schedules = listOf(task) + it.schedules) }
        persistWorkspace()
        showToast("Schedule added")
    }

    fun toggleSchedule(id: String) {
        _uiState.update { it.copy(schedules = it.schedules.map { s -> if (s.id == id) s.copy(enabled = !s.enabled) else s }) }
        persistWorkspace()
    }

    fun deleteSchedule(id: String) {
        _uiState.update { it.copy(schedules = it.schedules.filterNot { s -> s.id == id }) }
        persistWorkspace()
    }

    // --- Admin Studio Operations ---
    fun probeCluster() {
        viewModelScope.launch {
            _uiState.update { it.copy(isProbingCluster = true) }
            val probe = apiClient.probeClusterHealth()
            _uiState.update { state ->
                val updated = state.mcpServices.map { s ->
                    val hit = probe[s.id]
                    if (hit != null) s.copy(status = hit.first, latencyMs = hit.second, lastChecked = "Probed just now")
                    else s.copy(lastChecked = "Probed just now")
                }
                state.copy(isProbingCluster = false, mcpServices = updated)
            }
            persistAdmin()
            showToast("Cluster probe finished")
        }
    }

    fun rebootMcpService(id: String) {
        _uiState.update { it.copy(mcpServices = AdminOperationsHelper.rebootService(it.mcpServices, id)) }
        persistAdmin()
        showToast("Service rebooted")
    }

    fun rebootAllMcpServices() {
        _uiState.update { it.copy(mcpServices = AdminOperationsHelper.rebootAllServices(it.mcpServices)) }
        persistAdmin()
        showToast("All MCP services rebooted")
    }

    fun toggleSwarmWorker(id: String) {
        _uiState.update { it.copy(swarmWorkers = AdminOperationsHelper.toggleSwarmWorker(it.swarmWorkers, id)) }
        persistAdmin()
    }

    fun retryQueueJob(id: String) {
        _uiState.update { it.copy(queueJobs = AdminOperationsHelper.retryQueueJob(it.queueJobs, id)) }
        persistAdmin()
    }

    fun retryAllDlq() {
        _uiState.update { it.copy(queueJobs = AdminOperationsHelper.retryAllDlq(it.queueJobs)) }
        persistAdmin()
        showToast("DLQ jobs requeued")
    }

    fun clearCompletedJobs() {
        _uiState.update { it.copy(queueJobs = AdminOperationsHelper.clearCompletedJobs(it.queueJobs)) }
        persistAdmin()
    }

    fun runSchemaParitySync() {
        _uiState.update { it.copy(schemaTables = AdminOperationsHelper.runParitySync(it.schemaTables)) }
        persistAdmin()
        showToast("Schema parity synchronized")
    }

    fun toggleGatewayFailover(id: String) {
        _uiState.update { it.copy(gatewayRoutes = AdminOperationsHelper.toggleGatewayFailover(it.gatewayRoutes, id)) }
        persistAdmin()
    }

    fun toggleFeatureFlag(key: String) {
        _uiState.update { state ->
            val flags = state.featureFlags.map { if (it.key == key) it.copy(enabled = !it.enabled) else it }
            val flagMap = flags.associate { it.key to it.enabled }
            state.copy(featureFlags = flags, platformConfig = state.platformConfig.copy(featureFlags = flagMap))
        }
        persistAdmin()
    }

    fun addBlockedIp(ip: String, reason: String) {
        val clean = ip.trim()
        if (clean.isEmpty()) return
        _uiState.update { it.copy(blockedIps = listOf(BlockedIpRecord(clean, reason.ifBlank { "Manual rule" }, "Today")) + it.blockedIps) }
        persistAdmin()
        showToast("Blocked IP $clean")
    }

    fun removeBlockedIp(ip: String) {
        _uiState.update { it.copy(blockedIps = it.blockedIps.filterNot { b -> b.ip == ip }) }
        persistAdmin()
    }

    fun impersonateCustomer(customer: CustomerRecord) {
        val state = _uiState.value
        val adminSnapshot = state.originalAdminUser ?: state.authUser
        val impersonated = AuthUser(
            id = customer.id,
            name = customer.name,
            email = customer.email,
            avatar = customer.name.firstOrNull()?.uppercase() ?: "C",
            isAdminEligible = false,
            isDeveloperEligible = customer.isDeveloperEligible,
            role = UserRole.USER,
            plan = customer.tier
        )
        _uiState.update {
            it.copy(
                originalAdminUser = adminSnapshot,
                impersonatedCustomer = customer,
                authUser = impersonated,
                currentRole = UserRole.USER,
                settings = it.settings.copy(
                    name = customer.name,
                    email = customer.email,
                    plan = customer.tier,
                    monthlyTokensUsed = customer.tokensUsed,
                    monthlyTokensLimit = customer.tokenLimit
                )
            )
        }
        showToast("Viewing workspace as ${customer.name}")
    }

    fun exitImpersonation() {
        val admin = _uiState.value.originalAdminUser ?: return
        _uiState.update {
            it.copy(
                authUser = admin,
                originalAdminUser = null,
                impersonatedCustomer = null,
                currentRole = UserRole.ADMIN,
                settings = it.settings.copy(name = admin.name, email = admin.email, plan = admin.plan)
            )
        }
        showToast("Returned to Admin Studio")
    }

    private fun persistSessions(sessions: List<ChatSession>) {
        viewModelScope.launch { persistence.saveSessions(sessions) }
    }

    private fun persistWorkspace() {
        val s = _uiState.value
        viewModelScope.launch {
            persistence.saveWorkspace(
                PersistedWorkspaceBundle(
                    apiKeys = s.apiKeys,
                    webhooks = s.webhooks,
                    webhookDeliveries = s.webhookDeliveries,
                    knowledgeDocs = s.knowledgeDocs,
                    teamMembers = s.teamMembers,
                    invoices = s.invoices,
                    projects = s.projects,
                    plugins = s.plugins,
                    customPrompts = s.promptTemplates,
                    schedules = s.schedules
                )
            )
        }
    }

    private fun persistAdmin() {
        val s = _uiState.value
        viewModelScope.launch { persistence.saveAdmin(AdminOperationsHelper.toBundle(s)) }
    }

    override fun onCleared() {
        super.onCleared()
        streamJob?.cancel()
        voiceManager.release()
    }
}
