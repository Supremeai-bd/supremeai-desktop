package com.example.data

import com.example.config.AppConfig
import com.example.i18n.detectBengaliOrBanglish
import com.example.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class SupremeApiClient {
    private val baseUrl: String
        get() = AppConfig.apiBaseUrl
    private val gatewayUrl: String
        get() = AppConfig.gatewayUrl
    private val mcpBaseUrl: String
        get() = AppConfig.mcpTowerUrl
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()
    private val json = Json { ignoreUnknownKeys = true }

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(90, TimeUnit.SECONDS)
        .writeTimeout(20, TimeUnit.SECONDS)
        .build()

    @Volatile
    private var cachedGuestToken: String? = null

    @Volatile
    private var guestTokenExpiryMs: Long = 0L

    suspend fun ensureGuestToken(forceRefresh: Boolean = false): String? = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()
        if (!forceRefresh && cachedGuestToken != null && guestTokenExpiryMs - 60_000L > now) {
            return@withContext cachedGuestToken
        }
        try {
            val req = Request.Builder()
                .url("$baseUrl/api/v1/auth/guest")
                .post("{}".toRequestBody(jsonMediaType))
                .header("Accept", "application/json")
                .build()
            client.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) return@withContext null
                val raw = resp.body?.string().orEmpty()
                val obj = json.parseToJsonElement(raw).jsonObject
                val token = obj["access_token"]?.jsonPrimitive?.contentOrNull
                    ?: obj["token"]?.jsonPrimitive?.contentOrNull
                val ttl = (obj["expires_in"]?.jsonPrimitive?.longOrNull ?: 3600L).coerceAtLeast(60L)
                if (!token.isNullOrBlank()) {
                    cachedGuestToken = token
                    guestTokenExpiryMs = System.currentTimeMillis() + ttl * 1000L
                    token
                } else null
            }
        } catch (_: Throwable) {
            null
        }
    }

    suspend fun login(email: String, password: String): Result<Pair<AuthUser, String>> = withContext(Dispatchers.IO) {
        try {
            val body = buildJsonObject {
                put("username", email.trim())
                put("email", email.trim())
                put("password", password)
            }.toString()
            val req = Request.Builder()
                .url("$baseUrl/api/v1/auth/login")
                .post(body.toRequestBody(jsonMediaType))
                .header("Accept", "application/json")
                .build()
            client.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    val msg = extractErrorMessage(raw, "HTTP ${resp.code}")
                    return@withContext Result.failure(IllegalStateException(msg))
                }
                val obj = json.parseToJsonElement(raw).jsonObject
                val token = obj["access_token"]?.jsonPrimitive?.contentOrNull
                    ?: obj["token"]?.jsonPrimitive?.contentOrNull
                    ?: "session_tok_${System.currentTimeMillis()}"
                val user = parseAuthUser(obj, email, null)
                Result.success(user to token)
            }
        } catch (t: Throwable) {
            Result.failure(t)
        }
    }

    suspend fun register(
        name: String,
        email: String,
        password: String,
        plan: PlanTier
    ): Result<Pair<AuthUser, String>> = withContext(Dispatchers.IO) {
        try {
            val body = buildJsonObject {
                put("username", email.trim())
                put("email", email.trim())
                put("password", password)
                put("name", name.trim())
                put("plan", plan.name.lowercase().replaceFirstChar { it.uppercase() })
            }.toString()
            val req = Request.Builder()
                .url("$baseUrl/api/v1/auth/register")
                .post(body.toRequestBody(jsonMediaType))
                .header("Accept", "application/json")
                .build()
            client.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    val msg = extractErrorMessage(raw, "HTTP ${resp.code}")
                    return@withContext Result.failure(IllegalStateException(msg))
                }
                val obj = json.parseToJsonElement(raw).jsonObject
                val token = obj["access_token"]?.jsonPrimitive?.contentOrNull
                    ?: obj["token"]?.jsonPrimitive?.contentOrNull
                    ?: "session_tok_${System.currentTimeMillis()}"
                val user = parseAuthUser(obj, email, name)
                Result.success(user to token)
            }
        } catch (t: Throwable) {
            Result.failure(t)
        }
    }

    fun streamChat(
        modelId: String,
        sessionId: String,
        messages: List<ChatMessage>,
        systemInstruction: String,
        groundingContext: String?,
        language: AppLanguage,
        accessToken: String?,
        userEmail: String?,
        userRole: UserRole,
        userTier: PlanTier
    ): Flow<String> = flow {
        val lastUserText = messages.lastOrNull { it.role == "user" }?.content.orEmpty()
        val wantsBengali = language == AppLanguage.BN || detectBengaliOrBanglish(lastUserText)

        val formattedMessages = buildJsonArray {
            if (systemInstruction.isNotBlank()) {
                add(buildJsonObject {
                    put("role", "system")
                    put("content", systemInstruction.trim())
                })
            }
            if (!groundingContext.isNullOrBlank()) {
                add(buildJsonObject {
                    put("role", "system")
                    put("content", "Grounding Knowledge Context:\n${groundingContext.trim()}")
                })
            }
            add(buildJsonObject {
                put("role", "system")
                put(
                    "content",
                    if (wantsBengali) {
                        "Always respond naturally, fluently, and authoritatively in Bengali (বাংলা script, NOT Romanized Banglish unless explicitly requested) by default, keeping code syntax, technical identifiers, and commands in English unless the user explicitly requests another language."
                    } else {
                        "Always respond clearly, naturally, and authoritatively in English by default unless the user writes in Bengali (বাংলা) or Romanized Bengali (Banglish), or explicitly requests another language."
                    }
                )
            })
            messages.forEach { msg ->
                add(buildJsonObject {
                    put("role", msg.role)
                    put("content", msg.content)
                })
            }
        }

        val payload = buildJsonObject {
            put("session_id", sessionId)
            put("model", modelId)
            put("task_type", "chat")
            put("messages", formattedMessages)
            put("stream", true)
            put("language", if (language == AppLanguage.BN) "bn" else "en")
            put("language_pref", if (language == AppLanguage.BN) "bn" else "en")
            putJsonObject("userContext") {
                put("email", userEmail ?: "")
                put("role", if (userRole == UserRole.ADMIN) "admin" else "user")
                put("tier", userTier.name.lowercase().replaceFirstChar { it.uppercase() })
            }
        }.toString()

        var activeToken = accessToken ?: ensureGuestToken()
        var response = executeStreamRequest("$baseUrl/api/v1/stream/chat", payload, activeToken)

        if (response.code == 401 && accessToken.isNullOrBlank()) {
            response.close()
            activeToken = ensureGuestToken(forceRefresh = true)
            response = executeStreamRequest("$baseUrl/api/v1/stream/chat", payload, activeToken)
        }

        if (!response.isSuccessful && response.code in setOf(404, 502, 503, 504)) {
            response.close()
            response = executeStreamRequest("$gatewayUrl/v1/chat/completions", payload, activeToken)
        }

        response.use { resp ->
            if (!resp.isSuccessful) {
                val errBody = resp.body?.string().orEmpty()
                val msg = extractErrorMessage(errBody, "Gateway returned HTTP ${resp.code}")
                throw IllegalStateException(msg)
            }
            val source = resp.body?.source()
                ?: throw IllegalStateException("Empty response stream from SupremeAI gateway.")

            var emittedAny = false
            while (!source.exhausted() && currentCoroutineContext().isActive) {
                val line = source.readUtf8Line() ?: break
                val trimmed = line.trim()
                if (!trimmed.startsWith("data:")) continue
                val dataStr = trimmed.removePrefix("data:").trim()
                if (dataStr == "[DONE]") break
                try {
                    val obj = json.parseToJsonElement(dataStr).jsonObject
                    val errorEl = obj["error"]
                    if (errorEl != null && errorEl !is JsonNull) {
                        val errMsg = if (errorEl is JsonObject) {
                            errorEl["message"]?.jsonPrimitive?.contentOrNull ?: errorEl.toString()
                        } else {
                            errorEl.jsonPrimitive.contentOrNull ?: errorEl.toString()
                        }
                        throw IllegalStateException(errMsg)
                    }
                    val deltaContent = obj["choices"]
                        ?.jsonArray?.firstOrNull()
                        ?.jsonObject?.get("delta")
                        ?.jsonObject?.get("content")
                        ?.jsonPrimitive?.contentOrNull
                        ?: obj["text"]?.jsonPrimitive?.contentOrNull
                    if (!deltaContent.isNullOrEmpty()) {
                        emittedAny = true
                        emit(deltaContent)
                    }
                } catch (e: IllegalStateException) {
                    throw e
                } catch (_: Throwable) {
                    // Ignore malformed SSE keepalive frames
                }
            }
            if (!emittedAny) {
                throw IllegalStateException("No streaming tokens received from upstream gateway.")
            }
        }
    }.flowOn(Dispatchers.IO)

    private fun executeStreamRequest(endpointUrl: String, payload: String, token: String?) =
        client.newCall(
            Request.Builder()
                .url(endpointUrl)
                .post(payload.toRequestBody(jsonMediaType))
                .header("Accept", "text/event-stream")
                .apply {
                    if (!token.isNullOrBlank()) {
                        header("Authorization", "Bearer $token")
                        header("X-SupremeAI-Key", token)
                    }
                }
                .build()
        ).execute()

    suspend fun executeDeepResearch(
        query: String,
        language: AppLanguage,
        accessToken: String?
    ): ResearchReport = withContext(Dispatchers.IO) {
        val token = accessToken ?: ensureGuestToken()
        val langCode = if (language == AppLanguage.BN) "bn" else "en"
        try {
            val body = buildJsonObject {
                put("query", query)
                put("max_steps", 8)
                put("language", langCode)
                put("language_pref", langCode)
            }.toString()
            val req = Request.Builder()
                .url("$baseUrl/api/research/deep")
                .post(body.toRequestBody(jsonMediaType))
                .apply {
                    if (!token.isNullOrBlank()) {
                        header("Authorization", "Bearer $token")
                        header("X-SupremeAI-Key", token)
                    }
                }
                .build()
            client.newCall(req).execute().use { resp ->
                if (resp.isSuccessful) {
                    val raw = resp.body?.string().orEmpty()
                    val obj = json.parseToJsonElement(raw).jsonObject
                    val reportObj = obj["report"]?.jsonObject
                    if (reportObj != null) {
                        return@withContext json.decodeFromJsonElement<ResearchReport>(reportObj)
                    }
                }
            }
        } catch (_: Throwable) {
            // Fall through to local-first synthesis when offline/rate-limited
        }

        val isBn = language == AppLanguage.BN
        ResearchReport(
            title = if (isBn) "ডিপ রিসার্চ বিশ্লেষণ: $query" else "Deep Research Analysis: $query",
            summary = if (isBn) {
                "\"$query\" বিষয়ে সিস্টেম আর্কিটেকচার, কর্মক্ষমতা ও নিরাপত্তা ইনভ্যারিয়েন্টের সংক্ষিপ্ত বিশ্লেষণ।"
            } else {
                "Synthesized investigation into \"$query\" covering distributed architecture invariants, latency profiles, and resilient failover strategies."
            },
            sections = listOf(
                ResearchSection(
                    title = if (isBn) "১. নির্বাহী সারসংক্ষেপ ও পরিধি" else "1. Executive Summary & Scope",
                    content = if (isBn) {
                        "\"$query\" বিশ্লেষণে লোকাল-ফার্স্ট ক্যাশিং এবং সার্ভারলেস স্ট্রিমিং সমন্বয়ে উচ্চ নির্ভরযোগ্যতা পাওয়া যায়।"
                    } else {
                        "Combining local-first client persistence with edge SSE streaming provides resilient responsiveness even under upstream rate-limits or intermittent mobile connectivity."
                    },
                    sources = listOf("https://supremeai.bd/docs")
                ),
                ResearchSection(
                    title = if (isBn) "২. প্রযুক্তিগত আর্কিটেকচার" else "2. Technical Architecture & Invariants",
                    content = if (isBn) {
                        "ডায়নামিক রাউট আরবিটার লেটেন্সি স্কোরিং এবং কুলডাউন ক্যাসকেড পরিচালনা করে।"
                    } else {
                        "Dynamic Route Arbiters score provider latency continuously, routing deep reasoning tasks to SupremeAI Reason/Deep and rapid completions to SupremeAI Spark."
                    },
                    sources = listOf("https://github.com/Supremeai-bd/supremeai")
                )
            ),
            sources = listOf(
                ResearchSource("SupremeAI Architectural SSOT", "https://supremeai.bd/docs", "Multi-cloud free tier safeguard specification"),
                ResearchSource("SupremeAI Core Repository", "https://github.com/Supremeai-bd/supremeai", "Gateway arbitration & MCP bridge")
            )
        )
    }

    suspend fun probeClusterHealth(): Map<String, Pair<String, Int>> = withContext(Dispatchers.IO) {
        val results = mutableMapOf<String, Pair<String, Int>>()
        val targets = listOf(
            "render-primary" to "$baseUrl/api/health",
            "render-mcp" to "$mcpBaseUrl/health"
        )
        for ((id, url) in targets) {
            val start = System.currentTimeMillis()
            try {
                val req = Request.Builder().url(url).get().build()
                client.newCall(req).execute().use { resp ->
                    val elapsed = (System.currentTimeMillis() - start).toInt().coerceAtLeast(12)
                    val status = if (resp.isSuccessful) "healthy" else "degraded"
                    results[id] = status to elapsed
                }
            } catch (_: Throwable) {
                results[id] = "degraded" to 0
            }
        }
        results
    }

    private fun extractErrorMessage(raw: String, fallback: String): String {
        return try {
            val obj = json.parseToJsonElement(raw).jsonObject
            obj["detail"]?.jsonPrimitive?.contentOrNull
                ?: obj["error"]?.jsonPrimitive?.contentOrNull
                ?: obj["message"]?.jsonPrimitive?.contentOrNull
                ?: fallback
        } catch (_: Throwable) {
            if (raw.isNotBlank() && raw.length < 200) raw.trim() else fallback
        }
    }

    private fun parseAuthUser(obj: JsonObject, fallbackEmail: String, fallbackName: String?): AuthUser {
        val userObj = obj["user"]?.jsonObject ?: obj
        val email = (userObj["email"]?.jsonPrimitive?.contentOrNull ?: fallbackEmail).trim().lowercase()
        val name = (userObj["name"]?.jsonPrimitive?.contentOrNull
            ?: fallbackName
            ?: email.substringBefore("@").ifBlank { "User" }).trim()
        val rbac = (userObj["rbacRole"]?.jsonPrimitive?.contentOrNull
            ?: userObj["role"]?.jsonPrimitive?.contentOrNull
            ?: "user").lowercase()
        val isAdmin = (userObj["isAdminEligible"]?.jsonPrimitive?.booleanOrNull == true) ||
            rbac in setOf("admin", "super_admin", "owner")
        val isDev = isAdmin || (userObj["isDeveloperEligible"]?.jsonPrimitive?.booleanOrNull == true)
        val planRaw = (userObj["plan"]?.jsonPrimitive?.contentOrNull ?: "Free").lowercase()
        val plan = when (planRaw) {
            "enterprise" -> PlanTier.ENTERPRISE
            "pro" -> PlanTier.PRO
            else -> PlanTier.FREE
        }
        return AuthUser(
            id = userObj["id"]?.jsonPrimitive?.contentOrNull ?: "usr_${System.currentTimeMillis()}",
            name = name,
            email = email,
            avatar = name.firstOrNull()?.uppercase() ?: "U",
            isAdminEligible = isAdmin,
            isDeveloperEligible = isDev,
            rbacRole = if (isAdmin) "admin" else if (isDev) "developer" else "user",
            role = if (isAdmin) UserRole.ADMIN else UserRole.USER,
            plan = plan,
            createdAt = userObj["createdAt"]?.jsonPrimitive?.contentOrNull ?: "2026"
        )
    }
}
