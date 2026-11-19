package com.example.domain

import com.example.model.*

data class ExtractedArtifact(
    val code: String,
    val lang: String,
    val targetTab: String, // "preview" | "code"
    val isClosed: Boolean
)

object ChatIntentEngine {
    private val tierRank = mapOf(
        PlanTier.FREE to 0,
        PlanTier.PRO to 1,
        PlanTier.ENTERPRISE to 2
    )

    private val buildOrCodeAscii = Regex(
        "\\b(build|create|make|design|generate|refactor|debug|fix|component|dashboard|landing\\s*page|ecommerce|e-commerce|website|web\\s*app|react|tsx|jsx|html|css|tailwind|typescript|javascript|python|sql|api|endpoint|schema|database|chart|diagram|mermaid|app|ui|ux)\\b",
        RegexOption.IGNORE_CASE
    )
    private val buildOrCodeBn = Regex("(প্রজেক্ট|অ্যাপ|ওয়েবসাইট|ওয়েবসাইট|ড্যাশবোর্ড|কোড|বানাও|তৈরি\\s*করো|ডিজাইন)")
    private val explicitCodeAction = Regex(
        "\\b(build|create|make|design|generate|refactor|debug|fix|write\\s+code|implement)\\b|(বানাও|তৈরি\\s*করো|কোড|ডিজাইন)",
        RegexOption.IGNORE_CASE
    )
    private val deepReasoningAscii = Regex(
        "\\b(architect(?:ure)?|security\\s*audit|vulnerabilit(?:y|ies)|proof|theorem|algorithm|complexity|root\\s*cause|multi-file|distributed|race\\s*condition|invariant|benchmark)\\b",
        RegexOption.IGNORE_CASE
    )
    private val deepReasoningBn = Regex("(আর্কিটেকচার|অডিট|নিরাপত্তা|রুট\\s*কজ)")
    private val liveWebAscii = Regex(
        "\\b(latest|today|current|news|price|weather|stock|score|live|browse|open\\s+https?://|visit\\s+[a-z0-9.-]+\\.[a-z]{2,})\\b",
        RegexOption.IGNORE_CASE
    )
    private val liveWebBn = Regex("(সর্বশেষ|আজকের|খবর|দাম)")
    private val deepResearchAscii = Regex(
        "\\b(deep\\s*research|comprehensive\\s*(?:research\\s*)?report|in-depth\\s*(?:research|market|competitive)\\s*analysis|citation(?:-ready)?\\s*report|literature\\s*review)\\b",
        RegexOption.IGNORE_CASE
    )
    private val deepResearchBn = Regex("(গভীর\\s*রিসার্চ|রিসার্চ\\s*রিপোর্ট|বিস্তারিত\\s*গবেষণা|তুলনামূলক\\s*গবেষণা)")
    private val knowledgeReferenceAscii = Regex(
        "\\b(knowledge\\s*base|rag|uploaded\\s*(?:file|doc|document|pdf)|my\\s*(?:docs?|files?|notes?))\\b",
        RegexOption.IGNORE_CASE
    )
    private val knowledgeReferenceBn = Regex("(ডকুমেন্ট|ফাইল\\s*থেকে|নথি)")
    private val scheduleIntentRegex = Regex(
        "\\b(schedule|every\\s+(?:hour|day|week|morning)|daily|hourly|weekly|cron|monitor\\s+url|recurring\\s+check)\\b|(শিডিউল|প্রতিদিন|প্রতি\\s*ঘণ্টায়)",
        RegexOption.IGNORE_CASE
    )
    private val urlRegex = Regex("https?://[^\\s)\"'>]+", RegexOption.IGNORE_CASE)

    fun isModelAllowed(
        model: ModelDetail,
        config: PlatformConfig,
        userTier: PlanTier,
        currentRole: UserRole
    ): Boolean {
        if (currentRole == UserRole.ADMIN) return true
        val policy = config.modelPolicies[model.id] ?: return true
        if (!policy.enabled) return false
        return (tierRank[userTier] ?: 0) >= (tierRank[policy.minTier] ?: 0)
    }

    fun resolveAutoModel(
        promptText: String,
        attachment: ChatAttachment?,
        models: List<ModelDetail>,
        platformConfig: PlatformConfig,
        userTier: PlanTier,
        currentRole: UserRole,
        fallbackModel: ModelDetail
    ): ModelDetail {
        val allowed = models.filter { isModelAllowed(it, platformConfig, userTier, currentRole) }
        val pool = allowed.ifEmpty { models }

        fun findFirst(preferredIds: List<String>): ModelDetail {
            for (id in preferredIds) {
                pool.firstOrNull { it.id == id }?.let { return it }
            }
            return pool.firstOrNull() ?: fallbackModel
        }

        val trimmed = promptText.trim()
        val isDeepReasoning = deepReasoningAscii.containsMatchIn(trimmed) || deepReasoningBn.containsMatchIn(trimmed)
        val isBuildOrCode = buildOrCodeAscii.containsMatchIn(trimmed) || buildOrCodeBn.containsMatchIn(trimmed)
        val isLiveWeb = liveWebAscii.containsMatchIn(trimmed) || liveWebBn.containsMatchIn(trimmed)

        if (isDeepReasoning) {
            return findFirst(listOf("supreme-reason", "supreme-deep", "supreme-core", "supreme-spark"))
        }
        if (isLiveWeb && !explicitCodeAction.containsMatchIn(trimmed) && attachment == null) {
            return findFirst(listOf("supremeai-web", "supreme-core", "supreme-spark"))
        }
        if (isBuildOrCode || attachment != null) {
            if (trimmed.length > 160 || Regex("multi-file|full-stack|ecommerce|e-commerce|dashboard|app", RegexOption.IGNORE_CASE).containsMatchIn(trimmed)) {
                return findFirst(listOf("supreme-deep", "supreme-core", "supreme-reason", "supreme-spark"))
            }
            return findFirst(listOf("supreme-core", "supreme-spark", "supreme-deep"))
        }
        if (isLiveWeb) {
            return findFirst(listOf("supremeai-web", "supreme-core", "supreme-spark"))
        }
        if (trimmed.length > 260) {
            return findFirst(listOf("supreme-core", "supreme-spark"))
        }
        return findFirst(listOf("supreme-spark", "supreme-core"))
    }

    fun shouldAutoTriggerDeepResearch(promptText: String, attachment: ChatAttachment?): Boolean {
        if (attachment != null) return false
        val trimmed = promptText.trim()
        if (trimmed.isEmpty()) return false
        return deepResearchAscii.containsMatchIn(trimmed) || deepResearchBn.containsMatchIn(trimmed)
    }

    fun resolveAutoGroundingDocs(
        promptText: String,
        docs: List<KnowledgeDoc>,
        enableKnowledgeGrounding: Boolean
    ): List<KnowledgeDoc> {
        if (docs.isEmpty()) return emptyList()
        val explicitlyActive = docs.filter { it.isGroundingActive }
        if (explicitlyActive.isNotEmpty()) return explicitlyActive

        val trimmed = promptText.trim().lowercase()
        if (trimmed.isEmpty()) return emptyList()

        val titleMatches = docs.filter { doc ->
            val clean = doc.title.trim().lowercase()
            clean.length >= 4 && trimmed.contains(clean)
        }
        if (titleMatches.isNotEmpty()) return titleMatches

        if (enableKnowledgeGrounding &&
            (knowledgeReferenceAscii.containsMatchIn(promptText) || knowledgeReferenceBn.containsMatchIn(promptText))
        ) {
            return docs.take(4)
        }
        return emptyList()
    }

    fun isDefaultSessionTitle(title: String): Boolean {
        val clean = title.trim().lowercase()
        return clean.isEmpty() || clean == "supremeai chat" || clean == "new conversation" || clean == "new chat"
    }

    fun generateHeuristicChatTitle(prompt: String, attachment: ChatAttachment? = null): String {
        val cleaned = prompt
            .replace(Regex("```[\\s\\S]*?```"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()
        if (cleaned.isEmpty()) {
            return attachment?.name?.take(36) ?: "New Conversation"
        }
        val words = cleaned.split(" ").filter { it.isNotBlank() }.take(6)
        val joined = words.joinToString(" ")
        return if (joined.length > 44) joined.take(41) + "..." else joined
    }

    fun extractStreamingArtifact(markdown: String): ExtractedArtifact? {
        val fenceRegex = Regex("```([a-zA-Z0-9_-]*)\\n([\\s\\S]*?)(```|$)")
        val matches = fenceRegex.findAll(markdown).toList()
        if (matches.isEmpty()) return null

        val last = matches.last()
        val rawLang = last.groupValues[1].lowercase().ifBlank { "text" }
        val code = last.groupValues[2].trimEnd()
        val isClosed = last.groupValues[3] == "```"
        if (code.length < 24 || rawLang == "supreme-schedule") return null

        val previewLangs = setOf("html", "svg", "mermaid")
        val targetTab = if (rawLang in previewLangs) "preview" else "code"
        return ExtractedArtifact(
            code = code,
            lang = rawLang,
            targetTab = targetTab,
            isClosed = isClosed
        )
    }

    fun hasSchedulingIntent(prompt: String): Boolean = scheduleIntentRegex.containsMatchIn(prompt)

    fun detectBrowserNavigationIntent(prompt: String): String? {
        val lower = prompt.lowercase()
        if (!lower.contains("http") && !lower.contains("browse") && !lower.contains("open ") && !lower.contains("visit ")) {
            return null
        }
        return urlRegex.find(prompt)?.value
    }

    fun normalizeProxyInputUrl(rawUrl: String): String {
        val clean = rawUrl.trim()
        if (clean.isEmpty()) return ""
        if (clean.startsWith("http://") || clean.startsWith("https://")) return clean
        val looksLikeHost = clean.contains(".") || clean.startsWith("localhost")
        return if (!looksLikeHost || clean.contains(" ")) {
            "https://en.wikipedia.org/w/index.php?search=${java.net.URLEncoder.encode(clean, "UTF-8")}"
        } else {
            "https://$clean"
        }
    }

    fun parseScheduleFromPrompt(prompt: String, fallbackUrl: String): ScheduledTaskItem? {
        if (!hasSchedulingIntent(prompt)) return null
        val url = urlRegex.find(prompt)?.value ?: fallbackUrl.ifBlank { "https://supremeai.bd" }
        val lower = prompt.lowercase()
        val (cadence, cron) = when {
            lower.contains("hour") || lower.contains("প্রতি ঘণ্ট") -> "hourly" to "0 * * * *"
            lower.contains("week") -> "weekly" to "0 9 * * 1"
            else -> "daily" to "0 8 * * *"
        }
        val title = generateHeuristicChatTitle(prompt)
        return ScheduledTaskItem(
            id = "sched_${System.currentTimeMillis()}",
            title = title,
            targetUrl = url,
            cadence = cadence,
            cronExpression = cron,
            instruction = prompt.trim()
        )
    }
}
