package com.example.model

import kotlinx.serialization.Serializable

@Serializable
enum class UserRole { USER, ADMIN }

@Serializable
enum class PlanTier { FREE, PRO, ENTERPRISE }

@Serializable
enum class AppLanguage { EN, BN }

@Serializable
enum class WorkspaceContentLayout { COMPACT, FLUID, MAXIMIZED }

@Serializable
enum class ThemeMode { SYSTEM, LIGHT, DARK }

@Serializable
enum class MotionSpeed(val multiplier: Float) {
    CALM(0.55f),
    NORMAL(1.0f),
    DYNAMIC(1.65f)
}

@Serializable
enum class ScrimIntensity { SUBTLE, BALANCED, FOCUS }

@Serializable
enum class LiveThemeId {
    ALPINE_DUNES,
    MISTY_FJORDS,
    EMERALD_HIGHLANDS,
    AMBER_CANYON,
    MIDNIGHT_PEAKS,
    NEBULA,
    CYBERPUNK,
    AURORA_BOREALIS,
    OCEANIC_HORIZON,
    SOLAR_MEADOW,
    CYBER_STUDIO
}

@Serializable
enum class AvatarPreset {
    HOLOGRAM_MALE,
    CYBER_ORBIT,
    AURORA_NODE
}

@Serializable
data class AuthUser(
    val id: String,
    val name: String,
    val email: String,
    val avatar: String = "",
    val isAdminEligible: Boolean = false,
    val isDeveloperEligible: Boolean = false,
    val adminUserId: String? = null,
    val rbacRole: String = "user",
    val role: UserRole = UserRole.USER,
    val plan: PlanTier = PlanTier.FREE,
    val createdAt: String = ""
)

@Serializable
data class ChatAttachment(
    val name: String,
    val mimeType: String,
    val dataUri: String
)

@Serializable
data class BrowserNavigationMetadata(
    val url: String,
    val hostname: String,
    val title: String? = null,
    val statusCode: Int? = null,
    val isAuthWalled: Boolean = false,
    val proxyStatus: String = "loaded",
    val textPreview: String? = null
)

@Serializable
data class ResearchSection(
    val title: String,
    val content: String,
    val sources: List<String> = emptyList()
)

@Serializable
data class ResearchSource(
    val title: String,
    val url: String,
    val snippet: String = ""
)

@Serializable
data class ResearchReport(
    val title: String,
    val summary: String,
    val sections: List<ResearchSection> = emptyList(),
    val sources: List<ResearchSource> = emptyList()
)

@Serializable
data class ChatMessage(
    val id: String,
    val role: String, // "user" | "assistant" | "system"
    val content: String,
    val timestamp: Long = System.currentTimeMillis(),
    val model: String? = null,
    val roleName: String? = null,
    val attachment: ChatAttachment? = null,
    val researchReport: ResearchReport? = null,
    val browserNavigation: BrowserNavigationMetadata? = null
)

@Serializable
data class ChatSession(
    val id: String,
    val title: String,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val model: String = "supreme-spark",
    val roleId: String = "supreme-general",
    val customSystemInstruction: String? = null,
    val messages: List<ChatMessage> = emptyList(),
    val projectId: String? = null,
    val parentSessionId: String? = null,
    val isPinned: Boolean = false
)

@Serializable
data class RolePersona(
    val id: String,
    val name: String,
    val badge: String,
    val tagline: String,
    val description: String,
    val systemInstruction: String,
    val suggestedModel: String,
    val quickPrompts: List<String>
)

@Serializable
data class ModelDetail(
    val id: String,
    val name: String,
    val alias: String,
    val badge: String,
    val tagline: String,
    val description: String,
    val idealFor: String,
    val latencyRating: String, // Ultra-Fast | Balanced | Deep-Compute
    val contextTokens: String,
    val reasoningCapability: String, // Standard | High | Extreme
    val tier: String, // standard | advanced
    val accentColorHex: Long
)

@Serializable
data class PlanSpec(
    val id: PlanTier,
    val monthlyPriceUsd: Int,
    val monthlyTokensLimit: Long,
    val maxSeats: Int,
    val rateLimitRpm: Int,
    val contextWindowLabel: String
)

@Serializable
data class TopUpPackage(
    val id: String,
    val amountUsd: Int,
    val tokensBonus: Long,
    val badge: String? = null
)

@Serializable
data class UserAccountSettings(
    val name: String = "Guest User",
    val email: String = "",
    val role: UserRole = UserRole.USER,
    val plan: PlanTier = PlanTier.FREE,
    val monthlyTokensUsed: Long = 0L,
    val monthlyTokensLimit: Long = 100_000L,
    val emailNotifications: Boolean = true,
    val autoCodeReview: Boolean = true,
    val streamResponses: Boolean = true,
    val defaultModel: String = "supreme-core",
    val language: AppLanguage = AppLanguage.EN,
    val contentLayout: WorkspaceContentLayout = WorkspaceContentLayout.FLUID,
    val developerMode: Boolean = false,
    val autoModelRouting: Boolean = true,
    val enableKnowledgeGrounding: Boolean = false,
    val showWorkspaceTips: Boolean = true,
    val customInstructions: String = "",
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val liveThemeId: LiveThemeId = LiveThemeId.ALPINE_DUNES,
    val motionSpeed: MotionSpeed = MotionSpeed.NORMAL,
    val scrimIntensity: ScrimIntensity = ScrimIntensity.BALANCED,
    val avatarPreset: AvatarPreset = AvatarPreset.HOLOGRAM_MALE,
    val voicePitch: Float = 1.0f,
    val micSensitivity: Float = 1.0f
)
