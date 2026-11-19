package com.example.viewmodel

import com.example.data.SeedCatalog
import com.example.model.*

enum class WorkspaceDockTab { PREVIEW, CODE, BROWSER, SCHEDULE, TERMINAL }

data class WorkspaceDockState(
    val isOpen: Boolean = false,
    val activeTab: WorkspaceDockTab = WorkspaceDockTab.PREVIEW,
    val artifactCode: String = "",
    val artifactLanguage: String = "html",
    val isArtifactStreaming: Boolean = false,
    val liveArtifactSync: Boolean = true,
    val browserUrl: String = "https://supremeai.bd",
    val browserTitle: String = "SupremeAI Browser",
    val browserHistory: List<String> = listOf("https://supremeai.bd"),
    val terminalLogs: List<String> = listOf(
        "$ supremeai-studio status --cluster",
        "✔ DynamicRouteArbiter active · 6 foundation models ready",
        "✔ Local-First persistence mounted · Offline cache synced"
    )
)

data class StudioUiState(
    val isInitialized: Boolean = false,
    val sessions: List<ChatSession> = emptyList(),
    val activeSessionId: String = "",
    val activeModel: ModelDetail = SeedCatalog.MODELS.first(),
    val activeRole: RolePersona = SeedCatalog.ROLES.first(),
    val customInstruction: String = "",
    val isStreaming: Boolean = false,
    val streamingContent: String = "",
    val inferenceError: String? = null,
    val authUser: AuthUser? = null,
    val accessToken: String? = null,
    val currentRole: UserRole = UserRole.USER,
    val impersonatedCustomer: CustomerRecord? = null,
    val originalAdminUser: AuthUser? = null,
    val trustedUntilMs: Long? = null,
    val settings: UserAccountSettings = UserAccountSettings(),
    val apiKeys: List<ApiKeyItem> = SeedCatalog.INITIAL_API_KEYS,
    val webhooks: List<WebhookItem> = SeedCatalog.INITIAL_WEBHOOKS,
    val webhookDeliveries: List<WebhookDeliveryLog> = SeedCatalog.INITIAL_WEBHOOK_DELIVERIES,
    val knowledgeDocs: List<KnowledgeDoc> = SeedCatalog.INITIAL_KNOWLEDGE_DOCS,
    val teamMembers: List<TeamMember> = SeedCatalog.INITIAL_TEAM_MEMBERS,
    val invoices: List<BillingInvoice> = SeedCatalog.INITIAL_INVOICES,
    val projects: List<UserProject> = SeedCatalog.INITIAL_PROJECTS,
    val plugins: List<PluginItem> = SeedCatalog.INITIAL_PLUGINS,
    val promptTemplates: List<PromptTemplateItem> = SeedCatalog.INITIAL_PROMPT_TEMPLATES,
    val schedules: List<ScheduledTaskItem> = emptyList(),
    val customers: List<CustomerRecord> = SeedCatalog.INITIAL_CUSTOMERS,
    val mcpServices: List<McpTowerService> = SeedCatalog.INITIAL_MCP_SERVICES,
    val swarmWorkers: List<SwarmWorker> = SeedCatalog.INITIAL_SWARM_WORKERS,
    val queueJobs: List<TaskQueueJob> = SeedCatalog.INITIAL_QUEUE_JOBS,
    val schemaTables: List<SchemaParityTable> = SeedCatalog.INITIAL_SCHEMA_TABLES,
    val gatewayRoutes: List<LlmGatewayRoute> = SeedCatalog.INITIAL_GATEWAY_ROUTES,
    val securityEvents: List<SecurityEventLog> = SeedCatalog.INITIAL_SECURITY_EVENTS,
    val auditRecords: List<SystemAuditRecord> = SeedCatalog.INITIAL_AUDIT_RECORDS,
    val featureFlags: List<FeatureFlagItem> = SeedCatalog.INITIAL_FEATURE_FLAGS,
    val providerKeys: List<ProviderKeyItem> = SeedCatalog.INITIAL_PROVIDER_KEYS,
    val blockedIps: List<BlockedIpRecord> = SeedCatalog.INITIAL_BLOCKED_IPS,
    val platformConfig: PlatformConfig = PlatformConfig(),
    val isProbingCluster: Boolean = false,
    val isLiveVoiceOpen: Boolean = false,
    val isAuthLoading: Boolean = false,
    val authError: String? = null,
    val authPromptReason: String? = null,
    val showAuthModal: Boolean = false,
    val showTwoFactorModal: Boolean = false,
    val showPromptLibraryModal: Boolean = false,
    val showRoleModal: Boolean = false,
    val pendingInputInsertion: String? = null,
    val workspaceDock: WorkspaceDockState = WorkspaceDockState(),
    val toastMessage: String? = null
) {
    val activeSession: ChatSession?
        get() = sessions.firstOrNull { it.id == activeSessionId } ?: sessions.firstOrNull()

    val isGuest: Boolean
        get() = authUser == null

    val isAdminEligible: Boolean
        get() = authUser?.isAdminEligible == true

    val isDeveloperEligible: Boolean
        get() = !isGuest && (authUser?.isDeveloperEligible == true || currentRole == UserRole.ADMIN)

    val effectiveDeveloperMode: Boolean
        get() = isDeveloperEligible && settings.developerMode

    val effectiveAdminMode: Boolean
        get() = isAdminEligible && currentRole == UserRole.ADMIN

    val enableKnowledgeGrounding: Boolean
        get() = !isGuest && settings.enableKnowledgeGrounding

    val mcpAlertCount: Int
        get() = mcpServices.count { it.status != "healthy" }
}
