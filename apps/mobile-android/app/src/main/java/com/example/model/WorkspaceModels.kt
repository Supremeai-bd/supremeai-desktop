package com.example.model

import kotlinx.serialization.Serializable

@Serializable
data class UserProject(
    val id: String,
    val name: String,
    val repoUrl: String,
    val branch: String,
    val description: String,
    val language: String,
    val stars: Int,
    val lastSynced: Long,
    val aiReviewStatus: String // idle | reviewed | pending
)

@Serializable
data class PluginItem(
    val id: String,
    val name: String,
    val tagline: String,
    val description: String,
    val category: String, // developer | ai-grounding | productivity | security
    val isEnabled: Boolean,
    val version: String,
    val author: String
)

@Serializable
data class ApiKeyItem(
    val id: String,
    val name: String,
    val provider: String = "supremeai",
    val keyPrefix: String,
    val secretMasked: String,
    val createdAt: String,
    val lastUsed: String,
    val rateLimitRpm: Int,
    val status: String, // active | revoked
    val healthStatus: String = "healthy", // healthy | degraded | unhealthy | untested
    val lastChecked: String = "Just now",
    val permissions: List<String> = emptyList()
)

@Serializable
data class WebhookItem(
    val id: String,
    val name: String,
    val url: String,
    val events: List<String>,
    val secret: String,
    val active: Boolean,
    val lastTriggered: String,
    val failureCount: Int
)

@Serializable
data class WebhookDeliveryLog(
    val id: String,
    val webhookId: String,
    val eventType: String,
    val timestamp: String,
    val statusCode: Int,
    val latencyMs: Int,
    val payloadJson: String,
    val success: Boolean
)

@Serializable
data class KnowledgeDoc(
    val id: String,
    val title: String,
    val type: String, // pdf | markdown | code | url
    val sizeBytes: Long,
    val tokenCount: Int,
    val chunkCount: Int,
    val status: String, // indexed | indexing | error
    val lastIndexed: String,
    val isGroundingActive: Boolean,
    val contentPreview: String
)

@Serializable
data class TeamMember(
    val id: String,
    val name: String,
    val email: String,
    val avatar: String,
    val role: String, // Owner | Developer | Reviewer | Viewer
    val joinedDate: String,
    val twoFactorEnabled: Boolean,
    val status: String // active | invited
)

@Serializable
data class BillingInvoice(
    val id: String,
    val invoiceNumber: String,
    val date: String,
    val amountUsd: Double,
    val status: String, // paid | pending | failed
    val planName: String
)

@Serializable
data class ModelUsageSlice(
    val model: String,
    val tokens: Long,
    val percentage: Int,
    val cost: String,
    val colorHex: Long
)

@Serializable
data class PromptTemplateItem(
    val id: String,
    val title: String,
    val category: String, // code | architecture | security | review | general | writing | research
    val description: String,
    val template: String,
    val tags: List<String>
)

@Serializable
data class ScheduledTaskItem(
    val id: String,
    val title: String,
    val targetUrl: String,
    val cadence: String, // hourly | daily | weekly
    val cronExpression: String,
    val instruction: String,
    val enabled: Boolean = true,
    val lastRunAt: String = "Never"
)

@Serializable
data class CustomerRecord(
    val id: String,
    val name: String,
    val email: String,
    val tier: PlanTier,
    val status: String, // active | past_due | suspended
    val mrr: Int,
    val tokensUsed: Long,
    val tokenLimit: Long,
    val connectedRepos: Int,
    val joinedDate: String,
    val lastActive: String,
    val githubHandle: String? = null,
    val region: String,
    val isDeveloperEligible: Boolean = false
)

@Serializable
data class McpServiceLog(
    val id: String,
    val timestamp: String,
    val level: String, // INFO | WARN | ERROR
    val message: String,
    val details: String? = null
)

@Serializable
data class McpTowerService(
    val id: String,
    val name: String,
    val displayName: String,
    val category: String, // core | ai | integration | telemetry
    val port: Int,
    val status: String, // healthy | degraded | unhealthy | rebooting
    val uptime: String,
    val latencyMs: Int,
    val cpuPercent: Double,
    val memoryMb: Int,
    val lastChecked: String,
    val version: String,
    val endpoint: String,
    val errorCount: Int,
    val logs: List<McpServiceLog> = emptyList()
)

@Serializable
data class SwarmWorker(
    val id: String,
    val name: String,
    val type: String,
    val status: String, // active | idle | paused | error
    val currentTask: String,
    val currentIssueOrPr: String,
    val processedCount: Int,
    val successRate: Double,
    val cpuPercent: Double,
    val memoryMb: Int,
    val uptime: String,
    val logs: List<String> = emptyList()
)

@Serializable
data class TaskQueueJob(
    val id: String,
    val queueName: String,
    val taskType: String,
    val payloadSummary: String,
    val status: String, // active | waiting | completed | failed | dlq
    val attempts: Int,
    val maxAttempts: Int,
    val latencyMs: Int,
    val createdAt: String,
    val errorDetails: String? = null
)

@Serializable
data class SchemaParityTable(
    val id: String,
    val tableName: String,
    val localColumns: Int,
    val stagingColumns: Int,
    val prodColumns: Int,
    val driftDetected: Boolean,
    val driftSummary: String? = null,
    val rlsEnabled: Boolean,
    val lastMigrated: String
)

@Serializable
data class LlmGatewayRoute(
    val id: String,
    val modelId: String,
    val displayName: String,
    val primaryProvider: String,
    val fallbackProvider: String,
    val currentLatencyMs: Int,
    val errorRatePercent: Double,
    val requestsPerMin: Int,
    val costPer1MIn: Double,
    val costPer1MOut: Double,
    val customerPricePer1M: Double,
    val autoFailoverActive: Boolean
)

@Serializable
data class SecurityEventLog(
    val id: String,
    val timestamp: String,
    val severity: String, // low | medium | high | critical
    val category: String,
    val sourceIp: String,
    val customerEmail: String,
    val description: String,
    val blocked: Boolean
)

@Serializable
data class SystemAuditRecord(
    val id: String,
    val timestamp: String,
    val actor: String,
    val action: String,
    val resource: String,
    val details: String,
    val ipAddress: String
)

@Serializable
data class FeatureFlagItem(
    val key: String,
    val name: String,
    val description: String,
    val enabled: Boolean,
    val category: String
)

@Serializable
data class ProviderKeyItem(
    val id: String,
    val provider: String,
    val displayName: String,
    val maskedKey: String,
    val status: String,
    val latencyMs: Int,
    val priority: Int,
    val lastChecked: String,
    val rateLimitTpm: String
)

@Serializable
data class BlockedIpRecord(
    val ip: String,
    val reason: String,
    val date: String
)

@Serializable
data class ModelPolicy(
    val enabled: Boolean = true,
    val minTier: PlanTier = PlanTier.FREE
)

@Serializable
data class PlatformConfig(
    val maintenanceMode: Boolean = false,
    val maintenanceMessage: String = "Scheduled platform upgrade in progress.",
    val announcementActive: Boolean = false,
    val announcementMessage: String = "",
    val announcementLevel: String = "info",
    val allowNewSignups: Boolean = true,
    val defaultModelId: String = "supreme-spark",
    val featureFlags: Map<String, Boolean> = mapOf(
        "enable_multimodal_vision" to true,
        "enable_deep_research" to true,
        "enable_live_voice" to true,
        "enable_workspace_dock" to true
    ),
    val modelPolicies: Map<String, ModelPolicy> = mapOf(
        "supreme-spark" to ModelPolicy(true, PlanTier.FREE),
        "supreme-core" to ModelPolicy(true, PlanTier.FREE),
        "supreme-reason" to ModelPolicy(true, PlanTier.PRO),
        "supreme-deep" to ModelPolicy(true, PlanTier.PRO),
        "supremeai-web" to ModelPolicy(true, PlanTier.FREE),
        "supremeai-api" to ModelPolicy(true, PlanTier.FREE)
    )
)

@Serializable
data class EcosystemRepo(
    val name: String,
    val url: String,
    val description: String,
    val stack: String,
    val status: String
)
