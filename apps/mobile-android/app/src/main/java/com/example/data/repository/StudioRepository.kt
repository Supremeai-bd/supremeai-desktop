package com.example.data.repository

import com.example.config.AppConfig
import com.example.data.catalog.StudioCatalogs
import com.example.data.local.ApiKeyEntity
import com.example.data.local.AppDatabase
import com.example.data.local.AppMetadataEntity
import com.example.data.local.CachedModelEntity
import com.example.data.local.ChatMessageEntity
import com.example.data.local.ChatSessionEntity
import com.example.data.local.KnowledgeDocEntity
import com.example.data.local.PromptTemplateEntity
import com.example.data.local.ScheduledTaskEntity
import com.example.data.local.UserProjectEntity
import com.example.data.model.ApiKeyItem
import com.example.data.model.AppMetadataRecord
import com.example.data.model.AuthUser
import com.example.data.model.ChatMessage
import com.example.data.model.ChatSession
import com.example.data.model.KnowledgeDoc
import com.example.data.model.MessageAttachment
import com.example.data.model.MessageRole
import com.example.data.model.ModelDetail
import com.example.data.model.ModelTier
import com.example.data.model.OfflineCacheStats
import com.example.data.model.PlanTier
import com.example.data.model.PromptTemplate
import com.example.data.model.ResearchReportData
import com.example.data.model.ScheduledTask
import com.example.data.model.UserProject
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Serializable
data class SessionResumeMetadata(
    val activeSessionId: String? = null,
    val selectedModelId: String = "supreme-spark",
    val selectedRoleId: String = "supreme-general"
)

@Serializable
data class SyncStatusMetadata(
    val lastSyncedAt: Long = 0L,
    val source: String = "Local Cache"
)

class StudioRepository(private val db: AppDatabase) {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    val sessions: Flow<List<ChatSession>> = db.chatSessionDao().observeAllSessions().map { list ->
        list.map { it.toDomain() }
    }

    val cachedModels: Flow<List<ModelDetail>> = db.cachedModelDao().observeAllModels().map { list ->
        if (list.isEmpty()) StudioCatalogs.models else list.map { it.toDomain() }
    }

    val appMetadata: Flow<List<AppMetadataRecord>> = db.appMetadataDao().observeAllMetadata().map { list ->
        list.map { AppMetadataRecord(it.key, it.category, it.valueJson, it.updatedAt) }
    }

    val knowledgeDocs: Flow<List<KnowledgeDoc>> = db.knowledgeDocDao().observeAllDocs().map { list ->
        list.map { it.toDomain() }
    }

    val projects: Flow<List<UserProject>> = db.userProjectDao().observeAllProjects().map { list ->
        list.map { it.toDomain() }
    }

    val apiKeys: Flow<List<ApiKeyItem>> = db.apiKeyDao().observeAllKeys().map { list ->
        list.map { it.toDomain() }
    }

    val promptTemplates: Flow<List<PromptTemplate>> = db.promptTemplateDao().observeAllTemplates().map { list ->
        list.map { it.toDomain() }
    }

    val scheduledTasks: Flow<List<ScheduledTask>> = db.scheduledTaskDao().observeAllTasks().map { list ->
        list.map { it.toDomain() }
    }

    fun observeMessages(sessionId: String): Flow<List<ChatMessage>> =
        db.chatMessageDao().observeMessagesForSession(sessionId).map { list ->
            list.map { it.toDomain() }
        }

    fun observeRecentMessages(): Flow<List<ChatMessage>> =
        db.chatMessageDao().observeRecentMessages().map { list ->
            list.map { it.toDomain() }
        }

    fun searchSessionsOffline(query: String): Flow<List<ChatSession>> {
        val trimmed = query.trim()
        return if (trimmed.isEmpty()) {
            sessions
        } else {
            db.chatSessionDao().searchSessionsOffline(trimmed).map { list ->
                list.map { it.toDomain() }
            }
        }
    }

    fun observeCacheStats(isSyncingFlow: Flow<Boolean>): Flow<OfflineCacheStats> {
        val countsFlow = combine(
            db.chatSessionDao().observeSessionCount(),
            db.chatMessageDao().observeMessageCount(),
            db.appMetadataDao().observeMetadataCount(),
            db.cachedModelDao().observeModelCount()
        ) { sessionsCount, messagesCount, metadataCount, modelCount ->
            listOf(sessionsCount, messagesCount, metadataCount, modelCount)
        }
        return combine(
            countsFlow,
            db.appMetadataDao().observeByKey(KEY_SYNC_STATUS),
            isSyncingFlow
        ) { counts, syncEntry, isSyncing ->
            val syncMeta = syncEntry?.let {
                runCatching { json.decodeFromString<SyncStatusMetadata>(it.valueJson) }.getOrNull()
            }
            OfflineCacheStats(
                cachedSessionCount = counts[0],
                cachedMessageCount = counts[1],
                cachedMetadataCount = counts[2],
                cachedModelCount = counts[3],
                lastSyncedAt = syncMeta?.lastSyncedAt ?: 0L,
                isSyncing = isSyncing,
                lastSyncSource = syncMeta?.source ?: "Local Cache"
            )
        }
    }

    suspend fun seedInitialCatalogsIfEmpty() {
        if (db.knowledgeDocDao().countDocs() == 0) {
            db.knowledgeDocDao().upsertAll(StudioCatalogs.defaultKnowledgeDocs.map { it.toEntity() })
        }
        if (db.userProjectDao().countProjects() == 0) {
            db.userProjectDao().upsertAll(StudioCatalogs.defaultProjects.map { it.toEntity() })
        }
        if (db.promptTemplateDao().countTemplates() == 0) {
            db.promptTemplateDao().upsertAll(StudioCatalogs.defaultPromptTemplates.map { it.toEntity() })
        }
        if (db.scheduledTaskDao().countTasks() == 0) {
            db.scheduledTaskDao().upsertAll(StudioCatalogs.defaultSchedules.map { it.toEntity() })
        }
        if (db.cachedModelDao().countModels() == 0) {
            cacheModels(StudioCatalogs.models)
        }
        if (db.appMetadataDao().getByKey(KEY_ROLES_CATALOG) == null) {
            cacheAppMetadata(
                key = KEY_ROLES_CATALOG,
                category = "catalog",
                valueJson = json.encodeToString(StudioCatalogs.roles)
            )
        }
        if (db.appMetadataDao().getByKey(KEY_GATEWAY_CONFIG) == null) {
            cacheAppMetadata(
                key = KEY_GATEWAY_CONFIG,
                category = "gateway",
                valueJson = json.encodeToString(
                    mapOf(
                        "apiBaseUrl" to AppConfig.apiBaseUrl,
                        "mcpTowerUrl" to AppConfig.mcpTowerUrl
                    )
                )
            )
        }
    }

    suspend fun cacheModels(models: List<ModelDetail>) {
        val now = System.currentTimeMillis()
        db.cachedModelDao().upsertAllModels(models.map { it.toEntity(now) })
    }

    suspend fun cacheAppMetadata(key: String, category: String, valueJson: String) {
        db.appMetadataDao().upsertMetadata(
            AppMetadataEntity(
                key = key,
                category = category,
                valueJson = valueJson,
                updatedAt = System.currentTimeMillis()
            )
        )
    }

    suspend fun getAppMetadata(key: String): AppMetadataRecord? {
        return db.appMetadataDao().getByKey(key)?.let {
            AppMetadataRecord(it.key, it.category, it.valueJson, it.updatedAt)
        }
    }

    suspend fun cacheUserProfileMetadata(user: AuthUser) {
        cacheAppMetadata(
            key = KEY_USER_PROFILE,
            category = "account",
            valueJson = json.encodeToString(user)
        )
    }

    suspend fun cacheSessionResumeState(activeSessionId: String?, modelId: String, roleId: String) {
        cacheAppMetadata(
            key = KEY_SESSION_RESUME,
            category = "session_state",
            valueJson = json.encodeToString(
                SessionResumeMetadata(
                    activeSessionId = activeSessionId,
                    selectedModelId = modelId,
                    selectedRoleId = roleId
                )
            )
        )
    }

    suspend fun getSessionResumeState(): SessionResumeMetadata? {
        val entry = db.appMetadataDao().getByKey(KEY_SESSION_RESUME) ?: return null
        return runCatching { json.decodeFromString<SessionResumeMetadata>(entry.valueJson) }.getOrNull()
    }

    suspend fun recordSyncStatus(source: String) {
        cacheAppMetadata(
            key = KEY_SYNC_STATUS,
            category = "sync",
            valueJson = json.encodeToString(
                SyncStatusMetadata(
                    lastSyncedAt = System.currentTimeMillis(),
                    source = source
                )
            )
        )
    }

    suspend fun cacheRemoteSessions(remoteSessions: List<ChatSession>) {
        if (remoteSessions.isEmpty()) return
        val now = System.currentTimeMillis()
        val entities = remoteSessions.map { remote ->
            val existing = db.chatSessionDao().getSessionById(remote.id)
            if (existing != null) {
                existing.copy(
                    title = existing.title.ifBlank { remote.title },
                    updatedAt = maxOf(existing.updatedAt, remote.updatedAt),
                    messageCount = maxOf(existing.messageCount, remote.messageCount),
                    lastMessageSnippet = existing.lastMessageSnippet.ifBlank { remote.lastMessageSnippet },
                    lastSyncedAt = now
                )
            } else {
                remote.toEntity(lastSyncedAt = now)
            }
        }
        db.chatSessionDao().upsertSessions(entities)
    }

    suspend fun cacheRemoteMessages(sessionId: String, messages: List<ChatMessage>) {
        if (messages.isEmpty()) return
        db.chatMessageDao().upsertMessages(messages.map { it.toEntity() })
        val existingSession = db.chatSessionDao().getSessionById(sessionId)
        val total = db.chatMessageDao().countMessagesForSession(sessionId)
        val lastSnippet = messages.lastOrNull()?.content?.replace(Regex("""\s+"""), " ")?.take(120).orEmpty()
        if (existingSession != null) {
            db.chatSessionDao().upsertSession(
                existingSession.copy(
                    messageCount = maxOf(existingSession.messageCount, total),
                    lastMessageSnippet = lastSnippet.ifBlank { existingSession.lastMessageSnippet },
                    lastSyncedAt = System.currentTimeMillis()
                )
            )
        }
    }

    suspend fun clearOfflineChatCache() {
        db.chatSessionDao().clearAllSessions()
        cacheSessionResumeState(null, "supreme-spark", "supreme-general")
        recordSyncStatus("Cache Cleared")
    }

    suspend fun upsertSession(session: ChatSession) {
        db.chatSessionDao().upsertSession(session.toEntity())
    }

    suspend fun renameSession(sessionId: String, title: String) {
        db.chatSessionDao().renameSession(sessionId, title, System.currentTimeMillis())
    }

    suspend fun setSessionPinned(sessionId: String, pinned: Boolean) {
        db.chatSessionDao().setPinned(sessionId, pinned)
    }

    suspend fun deleteSession(sessionId: String) {
        db.chatSessionDao().deleteSession(sessionId)
    }

    suspend fun upsertMessage(message: ChatMessage) {
        db.chatMessageDao().upsertMessage(message.toEntity())
    }

    suspend fun upsertKnowledgeDoc(doc: KnowledgeDoc) {
        db.knowledgeDocDao().upsertDoc(doc.toEntity())
    }

    suspend fun deleteKnowledgeDoc(id: String) {
        db.knowledgeDocDao().deleteDoc(id)
    }

    suspend fun upsertProject(project: UserProject) {
        db.userProjectDao().upsertProject(project.toEntity())
    }

    suspend fun deleteProject(id: String) {
        db.userProjectDao().deleteProject(id)
    }

    suspend fun upsertApiKey(key: ApiKeyItem) {
        db.apiKeyDao().upsertKey(key.toEntity())
    }

    suspend fun deleteApiKey(id: String) {
        db.apiKeyDao().deleteKey(id)
    }

    suspend fun upsertPromptTemplate(template: PromptTemplate) {
        db.promptTemplateDao().upsertTemplate(template.toEntity())
    }

    suspend fun deletePromptTemplate(id: String) {
        db.promptTemplateDao().deleteTemplate(id)
    }

    suspend fun upsertScheduledTask(task: ScheduledTask) {
        db.scheduledTaskDao().upsertTask(task.toEntity())
    }

    suspend fun deleteScheduledTask(id: String) {
        db.scheduledTaskDao().deleteTask(id)
    }

    private fun ChatSessionEntity.toDomain() = ChatSession(
        id = id,
        title = title,
        createdAt = createdAt,
        updatedAt = updatedAt,
        isPinned = isPinned,
        roleId = roleId,
        modelId = modelId,
        messageCount = messageCount,
        lastMessageSnippet = lastMessageSnippet
    )

    private fun ChatSession.toEntity(lastSyncedAt: Long = 0L) = ChatSessionEntity(
        id = id,
        title = title,
        createdAt = createdAt,
        updatedAt = updatedAt,
        isPinned = isPinned,
        roleId = roleId,
        modelId = modelId,
        messageCount = messageCount,
        lastMessageSnippet = lastMessageSnippet,
        lastSyncedAt = lastSyncedAt
    )

    private fun CachedModelEntity.toDomain() = ModelDetail(
        id = id,
        name = name,
        badge = badge,
        description = description,
        descriptionBn = descriptionBn,
        contextWindow = contextWindow,
        tier = runCatching { ModelTier.valueOf(tier) }.getOrDefault(ModelTier.STANDARD),
        minPlan = runCatching { PlanTier.valueOf(minPlan) }.getOrDefault(PlanTier.FREE),
        accentHex = accentHex,
        speedLabel = speedLabel,
        latencyMs = latencyMs
    )

    private fun ModelDetail.toEntity(updatedAt: Long) = CachedModelEntity(
        id = id,
        name = name,
        badge = badge,
        description = description,
        descriptionBn = descriptionBn,
        contextWindow = contextWindow,
        tier = tier.name,
        minPlan = minPlan.name,
        accentHex = accentHex,
        speedLabel = speedLabel,
        latencyMs = latencyMs,
        updatedAt = updatedAt
    )

    private fun ChatMessageEntity.toDomain(): ChatMessage {
        val attachments = runCatching {
            json.decodeFromString<List<MessageAttachment>>(attachmentsJson)
        }.getOrDefault(emptyList())
        val report = researchReportJson?.let {
            runCatching { json.decodeFromString<ResearchReportData>(it) }.getOrNull()
        }
        val docIds = runCatching {
            json.decodeFromString<List<String>>(groundedDocIdsJson)
        }.getOrDefault(emptyList())
        return ChatMessage(
            id = id,
            sessionId = sessionId,
            role = MessageRole.valueOf(role),
            content = content,
            timestamp = timestamp,
            modelId = modelId,
            attachments = attachments,
            isStreaming = isStreaming,
            researchReport = report,
            groundedDocIds = docIds,
            tokensEstimate = tokensEstimate
        )
    }

    private fun ChatMessage.toEntity() = ChatMessageEntity(
        id = id,
        sessionId = sessionId,
        role = role.name,
        content = content,
        timestamp = timestamp,
        modelId = modelId,
        attachmentsJson = json.encodeToString(attachments),
        isStreaming = isStreaming,
        researchReportJson = researchReport?.let { json.encodeToString(it) },
        groundedDocIdsJson = json.encodeToString(groundedDocIds),
        tokensEstimate = tokensEstimate
    )

    private fun KnowledgeDocEntity.toDomain() = KnowledgeDoc(
        id = id,
        title = title,
        sourceType = sourceType,
        content = content,
        tokenCount = tokenCount,
        isActiveForGrounding = isActiveForGrounding,
        updatedAt = updatedAt
    )

    private fun KnowledgeDoc.toEntity() = KnowledgeDocEntity(
        id = id,
        title = title,
        sourceType = sourceType,
        content = content,
        tokenCount = tokenCount,
        isActiveForGrounding = isActiveForGrounding,
        updatedAt = updatedAt
    )

    private fun UserProjectEntity.toDomain() = UserProject(
        id = id,
        name = name,
        description = description,
        repoUrl = repoUrl,
        branch = branch,
        defaultModelId = defaultModelId,
        updatedAt = updatedAt,
        status = status
    )

    private fun UserProject.toEntity() = UserProjectEntity(
        id = id,
        name = name,
        description = description,
        repoUrl = repoUrl,
        branch = branch,
        defaultModelId = defaultModelId,
        updatedAt = updatedAt,
        status = status
    )

    private fun ApiKeyEntity.toDomain() = ApiKeyItem(
        id = id,
        name = name,
        maskedPrefix = maskedPrefix,
        createdAt = createdAt,
        lastUsedAt = lastUsedAt,
        isActive = isActive
    )

    private fun ApiKeyItem.toEntity() = ApiKeyEntity(
        id = id,
        name = name,
        maskedPrefix = maskedPrefix,
        createdAt = createdAt,
        lastUsedAt = lastUsedAt,
        isActive = isActive
    )

    private fun PromptTemplateEntity.toDomain() = PromptTemplate(
        id = id,
        title = title,
        titleBn = titleBn,
        category = category,
        promptText = promptText,
        recommendedModelId = recommendedModelId
    )

    private fun PromptTemplate.toEntity() = PromptTemplateEntity(
        id = id,
        title = title,
        titleBn = titleBn,
        category = category,
        promptText = promptText,
        recommendedModelId = recommendedModelId
    )

    private fun ScheduledTaskEntity.toDomain() = ScheduledTask(
        id = id,
        title = title,
        cronLabel = cronLabel,
        targetUrlOrPrompt = targetUrlOrPrompt,
        isEnabled = isEnabled,
        lastRunLabel = lastRunLabel
    )

    private fun ScheduledTask.toEntity() = ScheduledTaskEntity(
        id = id,
        title = title,
        cronLabel = cronLabel,
        targetUrlOrPrompt = targetUrlOrPrompt,
        isEnabled = isEnabled,
        lastRunLabel = lastRunLabel
    )

    companion object {
        const val KEY_SESSION_RESUME = "session_resume_state"
        const val KEY_USER_PROFILE = "user_profile_snapshot"
        const val KEY_ROLES_CATALOG = "catalog_roles_v1"
        const val KEY_GATEWAY_CONFIG = "gateway_endpoints"
        const val KEY_SYNC_STATUS = "offline_cache_sync_status"
    }
}
