package com.example.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        ChatSessionEntity::class,
        ChatMessageEntity::class,
        AppMetadataEntity::class,
        CachedModelEntity::class,
        KnowledgeDocEntity::class,
        UserProjectEntity::class,
        ApiKeyEntity::class,
        PromptTemplateEntity::class,
        ScheduledTaskEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun chatSessionDao(): ChatSessionDao
    abstract fun chatMessageDao(): ChatMessageDao
    abstract fun appMetadataDao(): AppMetadataDao
    abstract fun cachedModelDao(): CachedModelDao
    abstract fun knowledgeDocDao(): KnowledgeDocDao
    abstract fun userProjectDao(): UserProjectDao
    abstract fun apiKeyDao(): ApiKeyDao
    abstract fun promptTemplateDao(): PromptTemplateDao
    abstract fun scheduledTaskDao(): ScheduledTaskDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "supremeai_studio_local.db"
                )
                    .fallbackToDestructiveMigration(dropAllTables = true)
                    .build()
                    .also { INSTANCE = it }
            }
        }
    }
}
