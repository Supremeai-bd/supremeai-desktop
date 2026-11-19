package com.example.domain

import com.example.data.model.KnowledgeDoc
import com.example.data.model.PlanTier
import com.example.data.model.WorkspaceArtifact

object IntentUtils {

    private val deepReasonPattern = Regex(
        """\b(architect|architecture|design system|trade[- ]?off|prove|theorem|complexity|algorithm|refactor|root cause|distributed|consensus|security audit|optimize|benchmark)\b|আর্কিটেকচার|বিশ্লেষণ|যুক্তি|অ্যালগরিদম""",
        RegexOption.IGNORE_CASE
    )

    private val webSearchPattern = Regex(
        """\b(latest|today|news|2025|2026|current price|weather|release notes|compare prices|who won|stock|live)\b|সর্বশেষ|আজকের|খবর|তথ্য""",
        RegexOption.IGNORE_CASE
    )

    private val buildCodePattern = Regex(
        """\b(build|create app|dashboard|html|css|svg|mermaid|flowchart|diagram|component|react|kotlin|compose|typescript|sql|api endpoint|landing page|script)\b|কোড|তৈরি|ড্যাশবোর্ড|ডায়াগ্রাম""",
        RegexOption.IGNORE_CASE
    )

    private val deepResearchPattern = Regex(
        """\b(deep research|comprehensive report|in[- ]depth analysis|literature review|market analysis|benchmark report|research paper|compare .* in detail)\b|ডিপ রিসার্চ|গভীর গবেষণা|বিস্তারিত প্রতিবেদন""",
        RegexOption.IGNORE_CASE
    )

    fun resolveAutoModel(
        prompt: String,
        userPlan: PlanTier,
        hasAttachments: Boolean = false
    ): String {
        val text = prompt.trim()
        val canUseAdvanced = userPlan.rank >= PlanTier.PRO.rank

        return when {
            webSearchPattern.containsMatchIn(text) -> "supremeai-web"
            deepReasonPattern.containsMatchIn(text) -> if (canUseAdvanced) "supreme-reason" else "supreme-core"
            buildCodePattern.containsMatchIn(text) -> if (canUseAdvanced && text.length > 120) "supreme-deep" else "supreme-core"
            hasAttachments -> "supreme-core"
            text.length > 350 && canUseAdvanced -> "supreme-reason"
            text.length > 220 -> "supreme-core"
            else -> "supreme-spark"
        }
    }

    fun shouldAutoTriggerDeepResearch(prompt: String): Boolean {
        val trimmed = prompt.trim()
        return deepResearchPattern.containsMatchIn(trimmed)
    }

    fun resolveAutoGroundingDocs(
        prompt: String,
        docs: List<KnowledgeDoc>,
        maxDocs: Int = 3
    ): List<KnowledgeDoc> {
        val active = docs.filter { it.isActiveForGrounding }
        if (active.isEmpty()) return emptyList()
        val words = prompt.lowercase()
            .split(Regex("""\W+"""))
            .filter { it.length >= 3 }
            .toSet()

        if (words.isEmpty()) return active.take(maxDocs)

        val scored = active.map { doc ->
            val haystack = "${doc.title} ${doc.content}".lowercase()
            val hits = words.count { haystack.contains(it) }
            doc to hits
        }.sortedByDescending { it.second }

        val matched = scored.filter { it.second > 0 }.map { it.first }
        return if (matched.isNotEmpty()) matched.take(maxDocs) else active.take(1)
    }

    fun generateHeuristicChatTitle(firstPrompt: String): String {
        val cleaned = firstPrompt
            .replace(Regex("""```[\s\S]*?```"""), " Code ")
            .replace(Regex("""\s+"""), " ")
            .trim()
        if (cleaned.isBlank()) return "New Studio Session"
        val words = cleaned.split(" ").filter { it.isNotBlank() }
        val snippet = words.take(6).joinToString(" ")
        return if (snippet.length > 42) snippet.take(39) + "..." else snippet
    }

    fun extractStreamingArtifact(content: String): WorkspaceArtifact? {
        val fenceRegex = Regex("""```([a-zA-Z0-9_-]*)\n([\s\S]*?)(?:```|$)""")
        val matches = fenceRegex.findAll(content).toList()
        if (matches.isEmpty()) return null

        val preferredLanguages = setOf("html", "svg", "mermaid", "tsx", "jsx", "javascript", "js", "kotlin", "css")
        val bestMatch = matches.lastOrNull { m ->
            val lang = m.groupValues[1].lowercase().trim()
            lang in preferredLanguages && m.groupValues[2].trim().length > 24
        } ?: matches.lastOrNull { it.groupValues[2].trim().length > 40 } ?: return null

        val lang = bestMatch.groupValues[1].lowercase().trim().ifBlank { "text" }
        val code = bestMatch.groupValues[2].trimEnd()
        val title = when (lang) {
            "html" -> "Live HTML Preview"
            "svg" -> "Vector SVG Graphic"
            "mermaid" -> "Architecture Mermaid Graph"
            "kotlin" -> "Kotlin Module"
            "tsx", "jsx" -> "UI Component Code"
            else -> "${lang.uppercase()} Snippet"
        }
        return WorkspaceArtifact(
            id = "art-${code.hashCode()}",
            title = title,
            language = lang,
            code = code
        )
    }

    fun buildPreviewHtml(artifact: WorkspaceArtifact?, isDark: Boolean): String {
        val bg = if (isDark) "#0B1220" else "#F8FAFC"
        val fg = if (isDark) "#E2E8F0" else "#0F172A"
        val card = if (isDark) "#111A2E" else "#FFFFFF"
        val border = if (isDark) "#1E293B" else "#CBD5E1"

        if (artifact == null) {
            return """
                <!DOCTYPE html>
                <html><body style="margin:0;padding:24px;background:$bg;color:$fg;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:85vh;">
                <div style="text-align:center;max-width:340px;padding:20px;border:1px solid $border;border-radius:16px;background:$card;">
                  <h3 style="margin-top:0;color:#06B6D4;">Workspace Sandbox Ready</h3>
                  <p style="font-size:14px;opacity:0.8;">Ask SupremeAI to build an HTML dashboard, SVG graphic, or Mermaid diagram and it will render live here.</p>
                </div>
                </body></html>
            """.trimIndent()
        }

        val lang = artifact.language.lowercase()
        return when {
            lang == "html" -> {
                if (artifact.code.contains("<html", ignoreCase = true)) artifact.code
                else """<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;background:$bg;color:$fg;font-family:system-ui,sans-serif;}</style></head><body>${artifact.code}</body></html>"""
            }
            lang == "svg" -> """<!DOCTYPE html><html><body style="margin:0;padding:16px;background:$bg;display:flex;justify-content:center;align-items:center;min-height:90vh;">${artifact.code}</body></html>"""
            lang == "mermaid" -> {
                val escaped = artifact.code
                    .replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                """
                    <!DOCTYPE html>
                    <html><head><meta name="viewport" content="width=device-width,initial-scale=1">
                    <style>body{margin:0;padding:16px;background:$bg;color:$fg;font-family:monospace;} pre{white-space:pre-wrap;padding:16px;border-radius:12px;background:$card;border:1px solid $border;}</style>
                    </head><body>
                    <div style="margin-bottom:8px;font-family:sans-serif;font-size:12px;color:#06B6D4;font-weight:bold;">MERMAID TOPOLOGY SOURCE</div>
                    <pre>$escaped</pre>
                    </body></html>
                """.trimIndent()
            }
            else -> {
                val escaped = artifact.code
                    .replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                """
                    <!DOCTYPE html>
                    <html><body style="margin:0;padding:16px;background:$bg;color:$fg;font-family:monospace;">
                    <div style="margin-bottom:8px;font-family:sans-serif;font-size:12px;color:#38BDF8;font-weight:bold;">${artifact.title} (${artifact.language.uppercase()})</div>
                    <pre style="white-space:pre-wrap;padding:14px;border-radius:12px;background:$card;border:1px solid $border;font-size:12px;line-height:1.5;">$escaped</pre>
                    </body></html>
                """.trimIndent()
            }
        }
    }
}
