package com.example.data

import android.content.Context
import com.example.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File

@Serializable
data class PersistedWorkspaceBundle(
    val apiKeys: List<ApiKeyItem> = SeedCatalog.INITIAL_API_KEYS,
    val webhooks: List<WebhookItem> = SeedCatalog.INITIAL_WEBHOOKS,
    val webhookDeliveries: List<WebhookDeliveryLog> = SeedCatalog.INITIAL_WEBHOOK_DELIVERIES,
    val knowledgeDocs: List<KnowledgeDoc> = SeedCatalog.INITIAL_KNOWLEDGE_DOCS,
    val teamMembers: List<TeamMember> = SeedCatalog.INITIAL_TEAM_MEMBERS,
    val invoices: List<BillingInvoice> = SeedCatalog.INITIAL_INVOICES,
    val projects: List<UserProject> = SeedCatalog.INITIAL_PROJECTS,
    val plugins: List<PluginItem> = SeedCatalog.INITIAL_PLUGINS,
    val customPrompts: List<PromptTemplateItem> = SeedCatalog.INITIAL_PROMPT_TEMPLATES,
    val schedules: List<ScheduledTaskItem> = emptyList()
)

@Serializable
data class PersistedAuthBundle(
    val authUser: AuthUser? = null,
    val accessToken: String? = null,
    val currentRole: UserRole = UserRole.USER,
    val trustedUntilMs: Long? = null
)

@Serializable
data class PersistedAdminBundle(
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
    val platformConfig: PlatformConfig = PlatformConfig()
)

class LocalPersistenceRepository(private val context: Context) {
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        prettyPrint = false
    }

    private fun file(name: String): File = File(context.filesDir, name)

    private inline fun <reified T> readOrDefault(fileName: String, defaultValue: T): T {
        return try {
            val f = file(fileName)
            if (!f.exists()) defaultValue else json.decodeFromString<T>(f.readText())
        } catch (_: Throwable) {
            defaultValue
        }
    }

    private inline fun <reified T> writeAtomic(fileName: String, value: T) {
        try {
            val tmp = file("$fileName.tmp")
            tmp.writeText(json.encodeToString(value))
            tmp.renameTo(file(fileName))
        } catch (_: Throwable) {
            // Ignore disk write error gracefully
        }
    }

    suspend fun loadSessions(): List<ChatSession> = withContext(Dispatchers.IO) {
        val loaded = readOrDefault<List<ChatSession>>("supremeai_sessions.json", emptyList())
        if (loaded.isNotEmpty()) loaded else listOf(
            ChatSession(
                id = "session_${System.currentTimeMillis()}",
                title = "SupremeAI Chat",
                model = "supreme-spark",
                roleId = SeedCatalog.ROLES.first().id
            )
        )
    }

    suspend fun saveSessions(sessions: List<ChatSession>) = withContext(Dispatchers.IO) {
        writeAtomic("supremeai_sessions.json", sessions)
    }

    suspend fun loadSettings(): UserAccountSettings = withContext(Dispatchers.IO) {
        readOrDefault("supremeai_settings.json", UserAccountSettings())
    }

    suspend fun saveSettings(settings: UserAccountSettings) = withContext(Dispatchers.IO) {
        writeAtomic("supremeai_settings.json", settings)
    }

    suspend fun loadAuth(): PersistedAuthBundle = withContext(Dispatchers.IO) {
        readOrDefault("supremeai_auth.json", PersistedAuthBundle())
    }

    suspend fun saveAuth(auth: PersistedAuthBundle) = withContext(Dispatchers.IO) {
        writeAtomic("supremeai_auth.json", auth)
    }

    suspend fun loadWorkspace(): PersistedWorkspaceBundle = withContext(Dispatchers.IO) {
        readOrDefault("supremeai_workspace.json", PersistedWorkspaceBundle())
    }

    suspend fun saveWorkspace(bundle: PersistedWorkspaceBundle) = withContext(Dispatchers.IO) {
        writeAtomic("supremeai_workspace.json", bundle)
    }

    suspend fun loadAdmin(): PersistedAdminBundle = withContext(Dispatchers.IO) {
        readOrDefault("supremeai_admin.json", PersistedAdminBundle())
    }

    suspend fun saveAdmin(bundle: PersistedAdminBundle) = withContext(Dispatchers.IO) {
        writeAtomic("supremeai_admin.json", bundle)
    }
}
