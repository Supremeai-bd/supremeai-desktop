package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface ChatSessionDao {
    @Query("SELECT * FROM chat_sessions ORDER BY isPinned DESC, updatedAt DESC")
    fun observeAllSessions(): Flow<List<ChatSessionEntity>>

    @Query(
        """
        SELECT DISTINCT s.* FROM chat_sessions s
        LEFT JOIN chat_messages m ON s.id = m.sessionId
        WHERE s.title LIKE '%' || :query || '%'
           OR s.lastMessageSnippet LIKE '%' || :query || '%'
           OR m.content LIKE '%' || :query || '%'
        ORDER BY s.isPinned DESC, s.updatedAt DESC
        """
    )
    fun searchSessionsOffline(query: String): Flow<List<ChatSessionEntity>>

    @Query("SELECT COUNT(*) FROM chat_sessions")
    fun observeSessionCount(): Flow<Int>

    @Query("SELECT * FROM chat_sessions WHERE id = :sessionId LIMIT 1")
    suspend fun getSessionById(sessionId: String): ChatSessionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertSession(session: ChatSessionEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertSessions(sessions: List<ChatSessionEntity>)

    @Query("UPDATE chat_sessions SET title = :title, updatedAt = :updatedAt WHERE id = :sessionId")
    suspend fun renameSession(sessionId: String, title: String, updatedAt: Long)

    @Query("UPDATE chat_sessions SET isPinned = :pinned WHERE id = :sessionId")
    suspend fun setPinned(sessionId: String, pinned: Boolean)

    @Query("DELETE FROM chat_sessions WHERE id = :sessionId")
    suspend fun deleteSession(sessionId: String)

    @Query("DELETE FROM chat_sessions")
    suspend fun clearAllSessions()
}

@Dao
interface ChatMessageDao {
    @Query("SELECT * FROM chat_messages WHERE sessionId = :sessionId ORDER BY timestamp ASC")
    fun observeMessagesForSession(sessionId: String): Flow<List<ChatMessageEntity>>

    @Query("SELECT * FROM chat_messages ORDER BY timestamp DESC LIMIT 250")
    fun observeRecentMessages(): Flow<List<ChatMessageEntity>>

    @Query("SELECT COUNT(*) FROM chat_messages")
    fun observeMessageCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM chat_messages WHERE sessionId = :sessionId")
    suspend fun countMessagesForSession(sessionId: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertMessage(message: ChatMessageEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertMessages(messages: List<ChatMessageEntity>)

    @Query("DELETE FROM chat_messages WHERE sessionId = :sessionId")
    suspend fun deleteMessagesForSession(sessionId: String)
}

@Dao
interface AppMetadataDao {
    @Query("SELECT * FROM app_metadata ORDER BY updatedAt DESC")
    fun observeAllMetadata(): Flow<List<AppMetadataEntity>>

    @Query("SELECT * FROM app_metadata WHERE `key` = :key LIMIT 1")
    fun observeByKey(key: String): Flow<AppMetadataEntity?>

    @Query("SELECT COUNT(*) FROM app_metadata")
    fun observeMetadataCount(): Flow<Int>

    @Query("SELECT * FROM app_metadata WHERE `key` = :key LIMIT 1")
    suspend fun getByKey(key: String): AppMetadataEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertMetadata(entry: AppMetadataEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAllMetadata(entries: List<AppMetadataEntity>)

    @Query("DELETE FROM app_metadata")
    suspend fun clearAllMetadata()
}

@Dao
interface CachedModelDao {
    @Query("SELECT * FROM cached_models")
    fun observeAllModels(): Flow<List<CachedModelEntity>>

    @Query("SELECT COUNT(*) FROM cached_models")
    fun observeModelCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM cached_models")
    suspend fun countModels(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAllModels(models: List<CachedModelEntity>)
}

@Dao
interface KnowledgeDocDao {
    @Query("SELECT * FROM knowledge_docs ORDER BY updatedAt DESC")
    fun observeAllDocs(): Flow<List<KnowledgeDocEntity>>

    @Query("SELECT COUNT(*) FROM knowledge_docs")
    suspend fun countDocs(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertDoc(doc: KnowledgeDocEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(docs: List<KnowledgeDocEntity>)

    @Query("DELETE FROM knowledge_docs WHERE id = :id")
    suspend fun deleteDoc(id: String)
}

@Dao
interface UserProjectDao {
    @Query("SELECT * FROM user_projects ORDER BY updatedAt DESC")
    fun observeAllProjects(): Flow<List<UserProjectEntity>>

    @Query("SELECT COUNT(*) FROM user_projects")
    suspend fun countProjects(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertProject(project: UserProjectEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(projects: List<UserProjectEntity>)

    @Query("DELETE FROM user_projects WHERE id = :id")
    suspend fun deleteProject(id: String)
}

@Dao
interface ApiKeyDao {
    @Query("SELECT * FROM api_keys ORDER BY createdAt DESC")
    fun observeAllKeys(): Flow<List<ApiKeyEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertKey(key: ApiKeyEntity)

    @Query("DELETE FROM api_keys WHERE id = :id")
    suspend fun deleteKey(id: String)
}

@Dao
interface PromptTemplateDao {
    @Query("SELECT * FROM prompt_templates")
    fun observeAllTemplates(): Flow<List<PromptTemplateEntity>>

    @Query("SELECT COUNT(*) FROM prompt_templates")
    suspend fun countTemplates(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertTemplate(template: PromptTemplateEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(templates: List<PromptTemplateEntity>)

    @Query("DELETE FROM prompt_templates WHERE id = :id")
    suspend fun deleteTemplate(id: String)
}

@Dao
interface ScheduledTaskDao {
    @Query("SELECT * FROM scheduled_tasks")
    fun observeAllTasks(): Flow<List<ScheduledTaskEntity>>

    @Query("SELECT COUNT(*) FROM scheduled_tasks")
    suspend fun countTasks(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertTask(task: ScheduledTaskEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(tasks: List<ScheduledTaskEntity>)

    @Query("DELETE FROM scheduled_tasks WHERE id = :id")
    suspend fun deleteTask(id: String)
}
