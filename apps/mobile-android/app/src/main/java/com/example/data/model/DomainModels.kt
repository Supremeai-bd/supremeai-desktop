package com.example.data.model

import androidx.compose.ui.graphics.Color
import kotlinx.serialization.Serializable

@Serializable
enum class PlanTier(val rank: Int, val label: String, val monthlyCredits: Int) {
    FREE(0, "Free", 1_000),
    PRO(1, "Pro", 25_000),
    ENTERPRISE(2, "Enterprise", 250_000)
}

@Serializable
enum class AppLanguage(val code: String, val displayName: String) {
    EN("en", "English"),
    BN("bn", "বাংলা (Bengali)")
}

@Serializable
enum class ThemeMode(val key: String) {
    LIGHT("light"),
    DARK("dark"),
    SYSTEM("system")
}

@Serializable
enum class LiveThemeId(val key: String, val isDarkDefault: Boolean) {
    ALPINE_DUNES("alpine-dunes", false),
    MISTY_FJORDS("misty-fjords", false),
    EMERALD_HIGHLANDS("emerald-highlands", true),
    AMBER_CANYON("amber-canyon", true),
    MIDNIGHT_PEAKS("midnight-peaks", true),
    NEBULA("nebula", true),
    CYBERPUNK("cyberpunk", true),
    AURORA_BOREALIS("aurora-borealis", true),
    OCEANIC_HORIZON("oceanic-horizon", true),
    SOLAR_MEADOW("solar-meadow", false),
    CYBER_STUDIO("cyber-studio", true)
}

@Serializable
enum class VoicePersona(val id: String, val label: String, val basePitch: Float) {
    ZEPHYR("Zephyr", "Zephyr · Calm Strategist", 1.0f),
    PUCK("Puck", "Puck · Energetic Builder", 1.12f),
    KORE("Kore", "Kore · Crisp Analyst", 1.05f),
    CHARON("Charon", "Charon · Deep Architect", 0.86f),
    FENRIR("Fenrir", "Fenrir · Grounded Mentor", 0.92f)
}

@Serializable
enum class ModelTier {
    STANDARD,
    ADVANCED
}

@Serializable
data class ModelDetail(
    val id: String,
    val name: String,
    val badge: String,
    val description: String,
    val descriptionBn: String,
    val contextWindow: String,
    val tier: ModelTier,
    val minPlan: PlanTier,
    val accentHex: Long,
    val speedLabel: String,
    val latencyMs: Int
)

@Serializable
data class RolePersona(
    val id: String,
    val name: String,
    val nameBn: String,
    val category: String,
    val description: String,
    val descriptionBn: String,
    val systemInstruction: String,
    val suggestedModel: String,
    val quickPrompts: List<String>,
    val accentHex: Long
)

@Serializable
enum class MessageRole {
    USER,
    ASSISTANT,
    SYSTEM
}

@Serializable
data class MessageAttachment(
    val id: String,
    val name: String,
    val mimeType: String,
    val sizeBytes: Long,
    val uriString: String? = null,
    val inlineTextPreview: String? = null
)

@Serializable
data class ResearchCitation(
    val title: String,
    val url: String,
    val snippet: String = ""
)

@Serializable
data class ResearchReportData(
    val query: String,
    val summary: String,
    val keyFindings: List<String>,
    val citations: List<ResearchCitation>,
    val durationMs: Long = 0L
)

@Serializable
data class ChatMessage(
    val id: String,
    val sessionId: String,
    val role: MessageRole,
    val content: String,
    val timestamp: Long,
    val modelId: String? = null,
    val attachments: List<MessageAttachment> = emptyList(),
    val isStreaming: Boolean = false,
    val researchReport: ResearchReportData? = null,
    val groundedDocIds: List<String> = emptyList(),
    val tokensEstimate: Int = 0
)

@Serializable
data class ChatSession(
    val id: String,
    val title: String,
    val createdAt: Long,
    val updatedAt: Long,
    val isPinned: Boolean = false,
    val roleId: String = "supreme-general",
    val modelId: String = "supreme-spark",
    val messageCount: Int = 0,
    val lastMessageSnippet: String = ""
)

@Serializable
data class AppMetadataRecord(
    val key: String,
    val category: String,
    val valueJson: String,
    val updatedAt: Long
)

data class OfflineCacheStats(
    val cachedSessionCount: Int = 0,
    val cachedMessageCount: Int = 0,
    val cachedMetadataCount: Int = 0,
    val cachedModelCount: Int = 0,
    val lastSyncedAt: Long = 0L,
    val isSyncing: Boolean = false,
    val lastSyncSource: String = "Local Cache"
)

@Serializable
data class AuthUser(
    val id: String,
    val name: String,
    val email: String,
    val role: String = "member",
    val plan: PlanTier = PlanTier.FREE,
    val isGuest: Boolean = true,
    val creditsRemaining: Int = 1_000,
    val creditsTotal: Int = 1_000,
    val avatarInitials: String = "G"
)

@Serializable
data class UserAccountSettings(
    val language: AppLanguage = AppLanguage.EN,
    val themeMode: ThemeMode = ThemeMode.DARK,
    val liveThemeId: LiveThemeId = LiveThemeId.MIDNIGHT_PEAKS,
    val assistantName: String = "SupremeAI",
    val customInstructions: String = "",
    val streamingEnabled: Boolean = true,
    val autoRoutingEnabled: Boolean = true,
    val autoResearchEnabled: Boolean = true,
    val autoGroundingEnabled: Boolean = true,
    val compactDensity: Boolean = false,
    val developerMode: Boolean = false,
    val voicePersona: VoicePersona = VoicePersona.ZEPHYR,
    val voicePitch: Float = 1.0f,
    val voiceRate: Float = 1.0f,
    val micSensitivity: Float = 0.7f,
    val autoSpeakResponses: Boolean = false
)

@Serializable
data class KnowledgeDoc(
    val id: String,
    val title: String,
    val sourceType: String, // "Markdown", "Code", "Policy", "URL"
    val content: String,
    val tokenCount: Int,
    val isActiveForGrounding: Boolean = true,
    val updatedAt: Long = System.currentTimeMillis()
)

@Serializable
data class UserProject(
    val id: String,
    val name: String,
    val description: String,
    val repoUrl: String = "",
    val branch: String = "main",
    val defaultModelId: String = "supreme-core",
    val updatedAt: Long = System.currentTimeMillis(),
    val status: String = "Active"
)

@Serializable
data class PluginItem(
    val id: String,
    val name: String,
    val category: String,
    val description: String,
    val descriptionBn: String,
    val isEnabled: Boolean,
    val latencyLabel: String = "Instant",
    val requiresAuth: Boolean = false
)

@Serializable
data class ApiKeyItem(
    val id: String,
    val name: String,
    val maskedPrefix: String,
    val createdAt: Long,
    val lastUsedAt: Long? = null,
    val isActive: Boolean = true
)

@Serializable
data class WebhookItem(
    val id: String,
    val url: String,
    val events: List<String>,
    val isActive: Boolean = true,
    val lastStatusCode: Int = 200
)

@Serializable
data class TeamMember(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
    val status: String,
    val lastActiveLabel: String
)

@Serializable
data class PromptTemplate(
    val id: String,
    val title: String,
    val titleBn: String,
    val category: String,
    val promptText: String,
    val recommendedModelId: String
)

@Serializable
data class ScheduledTask(
    val id: String,
    val title: String,
    val cronLabel: String,
    val targetUrlOrPrompt: String,
    val isEnabled: Boolean = true,
    val lastRunLabel: String = "Scheduled"
)

@Serializable
enum class WorkspaceTab {
    PREVIEW,
    CODE,
    BROWSER,
    SCHEDULE,
    GRAPH,
    TERMINAL
}

@Serializable
data class WorkspaceArtifact(
    val id: String,
    val title: String,
    val language: String,
    val code: String,
    val updatedAt: Long = System.currentTimeMillis()
)

@Serializable
data class McpServiceInfo(
    val id: String,
    val name: String,
    val endpoint: String,
    val status: String, // "healthy", "degraded", "offline"
    val latencyMs: Int,
    val toolsCount: Int,
    val region: String
)

@Serializable
data class HitlApprovalItem(
    val id: String,
    val actionTitle: String,
    val agentName: String,
    val riskLevel: String, // "HIGH", "MEDIUM", "LOW"
    val payloadPreview: String,
    val requestedAtLabel: String,
    val status: String = "PENDING"
)

@Serializable
data class CustomerAccount(
    val id: String,
    val company: String,
    val contactEmail: String,
    val plan: PlanTier,
    val monthlyTokens: Long,
    val status: String
)

@Serializable
data class GatewayRouteInfo(
    val slug: String,
    val provider: String,
    val latencyMs: Int,
    val successRate: Double,
    val status: String
)

@Serializable
data class AuditLogEntry(
    val id: String,
    val timestampLabel: String,
    val actor: String,
    val action: String,
    val outcome: String
)

data class LiveThemeVisual(
    val id: LiveThemeId,
    val nameEn: String,
    val nameBn: String,
    val subtitleEn: String,
    val accentColor: Color,
    val secondaryColor: Color,
    val gradientColorsDark: List<Color>,
    val gradientColorsLight: List<Color>,
    val drawableResName: String? = null
)

@Serializable
enum class AppDestination {
    CHAT,
    HISTORY,
    SETTINGS,
    PLAN_USAGE,
    KNOWLEDGE_BASE,
    PROJECTS,
    PLUGINS,
    API_KEYS,
    TEAM,
    ADMIN_STUDIO
}
