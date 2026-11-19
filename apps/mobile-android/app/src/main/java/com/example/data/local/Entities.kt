package com.example.data.local

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "chat_sessions")
data class ChatSessionEntity(
    @PrimaryKey val id: String,
    val title: String,
    val createdAt: Long,
    val updatedAt: Long,
    val isPinned: Boolean,
    val roleId: String,
    val modelId: String,
    val messageCount: Int,
    val lastMessageSnippet: String = "",
    val lastSyncedAt: Long = 0L
)

@Entity(
    tableName = "chat_messages",
    foreignKeys = [
        ForeignKey(
            entity = ChatSessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["sessionId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("sessionId")]
)
data class ChatMessageEntity(
    @PrimaryKey val id: String,
    val sessionId: String,
    val role: String,
    val content: String,
    val timestamp: Long,
    val modelId: String?,
    val attachmentsJson: String,
    val isStreaming: Boolean,
    val researchReportJson: String?,
    val groundedDocIdsJson: String,
    val tokensEstimate: Int
)

@Entity(tableName = "app_metadata")
data class AppMetadataEntity(
    @PrimaryKey val key: String,
    val category: String,
    val valueJson: String,
    val updatedAt: Long
)

@Entity(tableName = "cached_models")
data class CachedModelEntity(
    @PrimaryKey val id: String,
    val name: String,
    val badge: String,
    val description: String,
    val descriptionBn: String,
    val contextWindow: String,
    val tier: String,
    val minPlan: String,
    val accentHex: Long,
    val speedLabel: String,
    val latencyMs: Int,
    val updatedAt: Long
)

@Entity(tableName = "knowledge_docs")
data class KnowledgeDocEntity(
    @PrimaryKey val id: String,
    val title: String,
    val sourceType: String,
    val content: String,
    val tokenCount: Int,
    val isActiveForGrounding: Boolean,
    val updatedAt: Long
)

@Entity(tableName = "user_projects")
data class UserProjectEntity(
    @PrimaryKey val id: String,
    val name: String,
    val description: String,
    val repoUrl: String,
    val branch: String,
    val defaultModelId: String,
    val updatedAt: Long,
    val status: String
)

@Entity(tableName = "api_keys")
data class ApiKeyEntity(
    @PrimaryKey val id: String,
    val name: String,
    val maskedPrefix: String,
    val createdAt: Long,
    val lastUsedAt: Long?,
    val isActive: Boolean
)

@Entity(tableName = "prompt_templates")
data class PromptTemplateEntity(
    @PrimaryKey val id: String,
    val title: String,
    val titleBn: String,
    val category: String,
    val promptText: String,
    val recommendedModelId: String
)

@Entity(tableName = "scheduled_tasks")
data class ScheduledTaskEntity(
    @PrimaryKey val id: String,
    val title: String,
    val cronLabel: String,
    val targetUrlOrPrompt: String,
    val isEnabled: Boolean,
    val lastRunLabel: String
)
