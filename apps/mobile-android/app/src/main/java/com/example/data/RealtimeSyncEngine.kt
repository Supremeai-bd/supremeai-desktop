package com.example.data

import com.example.config.AppConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.UUID
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong

/**
 * Cross-device Real-Time Sync client for SupremeAI Android.
 * Implements the exact canonical contract in packages/contracts/sync-protocol.json
 * so Android stays synchronized in real time with Web and Desktop (Tauri v2).
 */
@Serializable
data class SyncEnvelopeDto(
    val protocolVersion: String = "1.0.0",
    val deviceId: String,
    val platform: String = "android",
    val domain: String,
    val updatedAt: Long,
    val revision: Long,
    val payload: JsonElement
)

class RealtimeSyncEngine(
    private val deviceId: String = "dev-android-${UUID.randomUUID().toString().take(8)}"
) {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()
    private val revisionCounter = AtomicLong(0L)

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.SECONDS) // Long-lived SSE sync stream
        .writeTimeout(20, TimeUnit.SECONDS)
        .build()

    private val baseUrl: String
        get() = AppConfig.apiBaseUrl.trimEnd('/')

    suspend fun pushDomain(
        authToken: String,
        domain: String,
        payload: JsonElement
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val envelope = SyncEnvelopeDto(
                deviceId = deviceId,
                platform = "android",
                domain = domain,
                updatedAt = System.currentTimeMillis(),
                revision = revisionCounter.incrementAndGet(),
                payload = payload
            )
            val body = json.encodeToString(SyncEnvelopeDto.serializer(), envelope)
                .toRequestBody(jsonMediaType)
            val request = Request.Builder()
                .url("$baseUrl/api/v1/sync/state")
                .put(body)
                .header("Authorization", "Bearer $authToken")
                .header("X-SupremeAI-Device", deviceId)
                .header("X-SupremeAI-Platform", "android")
                .build()

            client.newCall(request).execute().use { it.isSuccessful }
        } catch (_: Exception) {
            false
        }
    }

    suspend fun pullSnapshotRaw(authToken: String): String? = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$baseUrl/api/v1/sync/state")
                .get()
                .header("Accept", "application/json")
                .header("Authorization", "Bearer $authToken")
                .header("X-SupremeAI-Device", deviceId)
                .build()
            client.newCall(request).execute().use { resp ->
                if (!resp.isSuccessful) null else resp.body?.string()
            }
        } catch (_: Exception) {
            null
        }
    }

    fun observeRealtimeStream(authToken: String): Flow<SyncEnvelopeDto> = flow {
        val request = Request.Builder()
            .url("$baseUrl/api/v1/sync/stream")
            .get()
            .header("Accept", "text/event-stream")
            .header("Authorization", "Bearer $authToken")
            .header("X-SupremeAI-Device", deviceId)
            .build()

        try {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return@flow
                val source = response.body?.source() ?: return@flow
                while (currentCoroutineContext().isActive && !source.exhausted()) {
                    val line = source.readUtf8Line() ?: break
                    if (!line.startsWith("data:")) continue
                    val data = line.removePrefix("data:").trim()
                    if (data.isEmpty() || data == "[DONE]") continue
                    runCatching {
                        json.decodeFromString(SyncEnvelopeDto.serializer(), data)
                    }.getOrNull()?.let { envelope ->
                        if (envelope.deviceId != deviceId) {
                            emit(envelope)
                        }
                    }
                }
            }
        } catch (_: Exception) {
            // Local-first Room SQLite storage continues uninterrupted offline
        }
    }.flowOn(Dispatchers.IO)
}
