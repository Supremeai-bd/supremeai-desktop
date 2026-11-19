package com.example

import android.app.Application
import com.example.data.LocalPersistenceRepository
import com.example.data.SupremeApiClient
import com.example.data.local.AppDatabase
import com.example.data.local.PreferencesStore
import com.example.data.repository.StudioRepository
import com.example.voice.VoiceCompanionManager

class SupremeAiApp : Application() {
    lateinit var database: AppDatabase
        private set
    lateinit var preferencesStore: PreferencesStore
        private set
    lateinit var repository: StudioRepository
        private set
    lateinit var localPersistence: LocalPersistenceRepository
        private set
    lateinit var apiClient: SupremeApiClient
        private set
    lateinit var voiceManager: VoiceCompanionManager
        private set

    override fun onCreate() {
        super.onCreate()
        database = AppDatabase.getInstance(this)
        preferencesStore = PreferencesStore(this)
        repository = StudioRepository(database)
        localPersistence = LocalPersistenceRepository(this)
        apiClient = SupremeApiClient()
        voiceManager = VoiceCompanionManager(this)
    }
}
