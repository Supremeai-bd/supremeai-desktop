package com.example.data.catalog

import androidx.compose.ui.graphics.Color
import com.example.data.model.AuditLogEntry
import com.example.data.model.CustomerAccount
import com.example.data.model.GatewayRouteInfo
import com.example.data.model.HitlApprovalItem
import com.example.data.model.KnowledgeDoc
import com.example.data.model.LiveThemeId
import com.example.data.model.LiveThemeVisual
import com.example.data.model.McpServiceInfo
import com.example.data.model.ModelDetail
import com.example.data.model.ModelTier
import com.example.data.model.PlanTier
import com.example.data.model.PluginItem
import com.example.data.model.PromptTemplate
import com.example.data.model.RolePersona
import com.example.data.model.ScheduledTask
import com.example.data.model.TeamMember
import com.example.data.model.UserProject

object StudioCatalogs {

    val models: List<ModelDetail> = listOf(
        ModelDetail(
            id = "supreme-spark",
            name = "SupremeAI Spark",
            badge = "Ultra-Fast",
            description = "Instant everyday intelligence for quick ideation, concise explanations, and multilingual chat.",
            descriptionBn = "দৈনন্দিন কাজ, দ্রুত আইডিয়া এবং সাবলীল চ্যাটের জন্য অতি-দ্রুত মডেল।",
            contextWindow = "1M+",
            tier = ModelTier.STANDARD,
            minPlan = PlanTier.FREE,
            accentHex = 0xFFF59E0B,
            speedLabel = "~180 ms",
            latencyMs = 180
        ),
        ModelDetail(
            id = "supreme-core",
            name = "SupremeAI Core",
            badge = "Balanced",
            description = "High-precision general engineering model for code generation, debugging, and structured workflows.",
            descriptionBn = "কোড জেনারেশন, ডিবাগিং এবং স্ট্রাকচার্ড ওয়ার্কফ্লো-র জন্য ভারসাম্যপূর্ণ মডেল।",
            contextWindow = "1M+",
            tier = ModelTier.STANDARD,
            minPlan = PlanTier.FREE,
            accentHex = 0xFF06B6D4,
            speedLabel = "~320 ms",
            latencyMs = 320
        ),
        ModelDetail(
            id = "supreme-reason",
            name = "SupremeAI Reason",
            badge = "Deep-Compute",
            description = "Extended chain-of-thought reasoning for architecture reviews, proofs, algorithms, and complex trade-offs.",
            descriptionBn = "সিস্টেম আর্কিটেকচার, জটিল অ্যালগরিদম ও গভীর বিশ্লেষণের জন্য ডিপ রিজনিং মডেল।",
            contextWindow = "2M+",
            tier = ModelTier.ADVANCED,
            minPlan = PlanTier.PRO,
            accentHex = 0xFF8B5CF6,
            speedLabel = "~780 ms",
            latencyMs = 780
        ),
        ModelDetail(
            id = "supreme-deep",
            name = "SupremeAI Deep",
            badge = "Autonomous",
            description = "Full-stack synthesis powerhouse for multi-file refactoring, security audits, and live artifacts.",
            descriptionBn = "ফুল-স্ট্যাক সিন্থেসিস, মাল্টি-ফাইল কোড ও লাইভ আর্টিফ্যাক্ট তৈরির শক্তিশালী মডেল।",
            contextWindow = "2M+",
            tier = ModelTier.ADVANCED,
            minPlan = PlanTier.PRO,
            accentHex = 0xFF10B981,
            speedLabel = "~690 ms",
            latencyMs = 690
        ),
        ModelDetail(
            id = "supremeai-web",
            name = "SupremeAI Web",
            badge = "Live Search",
            description = "Real-time research and web-grounded verification with inline citations and source synthesis.",
            descriptionBn = "লাইভ সার্চ, তথ্য যাচাই এবং রেফারেন্সসহ রিসার্চ রিপোর্ট তৈরির মডেল।",
            contextWindow = "1M+",
            tier = ModelTier.STANDARD,
            minPlan = PlanTier.FREE,
            accentHex = 0xFF3B82F6,
            speedLabel = "~410 ms",
            latencyMs = 410
        ),
        ModelDetail(
            id = "supremeai-api",
            name = "SupremeAI API",
            badge = "Low-Latency",
            description = "Deterministic schema-first engine tuned for JSON pipelines, tool calling, and gateway automation.",
            descriptionBn = "JSON পাইপলাইন, টুল কলিং ও এপিআই অটোমেশনের জন্য বিশেষায়িত মডেল।",
            contextWindow = "2M+",
            tier = ModelTier.STANDARD,
            minPlan = PlanTier.FREE,
            accentHex = 0xFFF43F5E,
            speedLabel = "~210 ms",
            latencyMs = 210
        )
    )

    val roles: List<RolePersona> = listOf(
        RolePersona(
            id = "supreme-general",
            name = "Supreme Assistant",
            nameBn = "সুপ্রিম অ্যাসিস্ট্যান্ট",
            category = "General",
            description = "Versatile studio partner for research, writing, analysis, and rapid problem solving.",
            descriptionBn = "গবেষণা, লেখালেখি, বিশ্লেষণ ও দ্রুত সমাধানের জন্য বহুমুখী স্টুডিও সহায়ক।",
            systemInstruction = "You are SupremeAI Studio, a calm, authoritative, and concise AI workspace assistant. Provide clear, actionable, production-grade answers.",
            suggestedModel = "supreme-spark",
            quickPrompts = listOf(
                "Summarize edge vs cloud inference trade-offs in 5 bullet points",
                "Build a clean HTML/CSS SaaS pricing comparison card",
                "Explain OAuth2 PKCE flow step by step"
            ),
            accentHex = 0xFF06B6D4
        ),
        RolePersona(
            id = "supreme-architect",
            name = "Systems Architect",
            nameBn = "সিস্টেম আর্কিটেক্ট",
            category = "Engineering",
            description = "Designs resilient distributed systems, API gateways, database schemas, and failover topologies.",
            descriptionBn = "বিতরণকৃত সিস্টেম, এপিআই গেটওয়ে ও নির্ভরযোগ্য ডেটাবেস আর্কিটেকচার ডিজাইন করে।",
            systemInstruction = "Act as a Principal Distributed Systems Architect. Focus on fault tolerance, latency budgets, data consistency, and clean Mermaid architecture diagrams.",
            suggestedModel = "supreme-reason",
            quickPrompts = listOf(
                "Create a Mermaid diagram for multi-region LLM gateway failover",
                "Design a zero-trust RBAC schema for enterprise workspaces",
                "Review CQRS vs event sourcing for real-time telemetry"
            ),
            accentHex = 0xFF8B5CF6
        ),
        RolePersona(
            id = "supreme-fullstack",
            name = "Full-Stack Builder",
            nameBn = "ফুল-স্ট্যাক বিল্ডার",
            category = "Development",
            description = "Ships interactive UI artifacts, Kotlin/TypeScript modules, and end-to-end REST integrations.",
            descriptionBn = "ইন্টারেক্টিভ ইউআই আর্টিফ্যাক্ট, কোড মডিউল ও এপিআই ইন্টিগ্রেশন দ্রুত তৈরি করে।",
            systemInstruction = "Act as a Senior Full-Stack Engineer. Return clean, complete, runnable code blocks (including interactive HTML/SVG/Mermaid artifacts when visual UI is requested).",
            suggestedModel = "supreme-deep",
            quickPrompts = listOf(
                "Build an interactive HTML analytics dashboard with live SVG chart",
                "Write a Kotlin OkHttp SSE streaming client with retry backoff",
                "Generate a responsive landing page hero section in HTML"
            ),
            accentHex = 0xFF10B981
        ),
        RolePersona(
            id = "supreme-fast-dev",
            name = "Rapid Prototyper",
            nameBn = "র‍্যাপিড প্রোটোটাইপার",
            category = "Velocity",
            description = "Turns rough ideas into working MVPs, CLI scripts, and testable boilerplate in seconds.",
            descriptionBn = "ধারণাগুলোকে কয়েক সেকেন্ডের মধ্যে কার্যকরী প্রোটোটাইপ ও স্ক্রিপ্টে রূপান্তর করে।",
            systemInstruction = "Optimize for speed and clarity. Provide minimal, copy-paste-ready prototypes without unnecessary ceremony.",
            suggestedModel = "supreme-core",
            quickPrompts = listOf(
                "Draft a clean Kotlin Room DAO + Repository template",
                "Write a curl + jq smoke test script for chat completions",
                "Convert this product spec into 6 sprint stories"
            ),
            accentHex = 0xFFF59E0B
        ),
        RolePersona(
            id = "supreme-security",
            name = "Security & Policy Auditor",
            nameBn = "নিরাপত্তা ও পলিসি অডিটর",
            category = "Security",
            description = "Audits auth flows, OWASP risks, API key rotation, HITL guardrails, and compliance.",
            descriptionBn = "অথেনটিকেশন ফ্লো, নিরাপত্তা ঝুঁকি, কী রোটেশন ও কমপ্লায়েন্স অডিট করে।",
            systemInstruction = "Act as an Application Security Lead. Identify threat vectors, secret-handling risks, injection flaws, and provide concrete mitigations.",
            suggestedModel = "supreme-reason",
            quickPrompts = listOf(
                "Audit JWT + TOTP 2FA session rotation for mobile clients",
                "Checklist for Google Play Data Safety & zero-permission media picker",
                "Harden webhook HMAC signature verification"
            ),
            accentHex = 0xFFF43F5E
        )
    )

    val liveThemes: List<LiveThemeVisual> = listOf(
        LiveThemeVisual(
            id = LiveThemeId.MIDNIGHT_PEAKS,
            nameEn = "Midnight Peaks",
            nameBn = "মিডনাইট পিকস",
            subtitleEn = "Obsidian alpine ridge with cool cyan pulse",
            accentColor = Color(0xFF06B6D4),
            secondaryColor = Color(0xFF38BDF8),
            gradientColorsDark = listOf(Color(0xFF070B14), Color(0xFF0F172A), Color(0xFF132238)),
            gradientColorsLight = listOf(Color(0xFFE0F2FE), Color(0xFFF1F5F9), Color(0xFFE2E8F0)),
            drawableResName = "img_bg_midnight_peaks"
        ),
        LiveThemeVisual(
            id = LiveThemeId.ALPINE_DUNES,
            nameEn = "Alpine Dunes",
            nameBn = "অ্যালপাইন ডিউনস",
            subtitleEn = "Crisp daylight horizon with sculpted sand",
            accentColor = Color(0xFF0284C7),
            secondaryColor = Color(0xFF0EA5E9),
            gradientColorsDark = listOf(Color(0xFF0C1524), Color(0xFF17253B), Color(0xFF1E324D)),
            gradientColorsLight = listOf(Color(0xFFF8FAFC), Color(0xFFEFF6FF), Color(0xFFE2E8F0)),
            drawableResName = "img_bg_alpine_dunes"
        ),
        LiveThemeVisual(
            id = LiveThemeId.MISTY_FJORDS,
            nameEn = "Misty Fjords",
            nameBn = "মিস্টি ফজর্ডস",
            subtitleEn = "Serene Nordic slate and glacial mist",
            accentColor = Color(0xFF0D9488),
            secondaryColor = Color(0xFF2DD4BF),
            gradientColorsDark = listOf(Color(0xFF09151B), Color(0xFF10242D), Color(0xFF183640)),
            gradientColorsLight = listOf(Color(0xFFF0FDFA), Color(0xFFE2F1F8), Color(0xFFDBEAFE)),
            drawableResName = "img_bg_misty_fjords"
        ),
        LiveThemeVisual(
            id = LiveThemeId.EMERALD_HIGHLANDS,
            nameEn = "Emerald Highlands",
            nameBn = "এমেরাল্ড হাইল্যান্ডস",
            subtitleEn = "Deep pine canopy and luminous jade aura",
            accentColor = Color(0xFF10B981),
            secondaryColor = Color(0xFF34D399),
            gradientColorsDark = listOf(Color(0xFF051510), Color(0xFF0A241B), Color(0xFF12382B)),
            gradientColorsLight = listOf(Color(0xFFECFDF5), Color(0xFFD1FAE5), Color(0xFFE2E8F0)),
            drawableResName = "img_bg_emerald_highlands"
        ),
        LiveThemeVisual(
            id = LiveThemeId.AMBER_CANYON,
            nameEn = "Amber Canyon",
            nameBn = "অ্যাম্বার ক্যানিয়ন",
            subtitleEn = "Warm sandstone twilight with gold sparks",
            accentColor = Color(0xFFF59E0B),
            secondaryColor = Color(0xFFFB923C),
            gradientColorsDark = listOf(Color(0xFF160D07), Color(0xFF29160B), Color(0xFF3A1E0E)),
            gradientColorsLight = listOf(Color(0xFFFFFBEB), Color(0xFFFEF3C7), Color(0xFFFDE68A)),
            drawableResName = "img_bg_amber_canyon"
        ),
        LiveThemeVisual(
            id = LiveThemeId.NEBULA,
            nameEn = "Cosmic Nebula",
            nameBn = "কসমিক নেবুলা",
            subtitleEn = "Deep space violet stardust & orbital glow",
            accentColor = Color(0xFF8B5CF6),
            secondaryColor = Color(0xFFC084FC),
            gradientColorsDark = listOf(Color(0xFF090617), Color(0xFF170D36), Color(0xFF23134F)),
            gradientColorsLight = listOf(Color(0xFFF5F3FF), Color(0xFFEDE9FE), Color(0xFFE0E7FF))
        ),
        LiveThemeVisual(
            id = LiveThemeId.CYBERPUNK,
            nameEn = "Cyber Grid",
            nameBn = "সাইবার গ্রিড",
            subtitleEn = "High-contrast neon rose & electric cyan",
            accentColor = Color(0xFFF43F5E),
            secondaryColor = Color(0xFF22D3EE),
            gradientColorsDark = listOf(Color(0xFF0B0714), Color(0xFF1E0B24), Color(0xFF0C1F2E)),
            gradientColorsLight = listOf(Color(0xFFFFF1F2), Color(0xFFFCE7F3), Color(0xFFE0F2FE))
        ),
        LiveThemeVisual(
            id = LiveThemeId.AURORA_BOREALIS,
            nameEn = "Aurora Borealis",
            nameBn = "অরোরা বোরিয়ালিস",
            subtitleEn = "Polar ribbons of teal and emerald light",
            accentColor = Color(0xFF2DD4BF),
            secondaryColor = Color(0xFF60A5FA),
            gradientColorsDark = listOf(Color(0xFF040E14), Color(0xFF08222B), Color(0xFF0F313D)),
            gradientColorsLight = listOf(Color(0xFFECFEFF), Color(0xFFCFFAFE), Color(0xFFE0F2FE))
        ),
        LiveThemeVisual(
            id = LiveThemeId.OCEANIC_HORIZON,
            nameEn = "Oceanic Horizon",
            nameBn = "ওশানিক হরাইজন",
            subtitleEn = "Bioluminescent abyssal blue currents",
            accentColor = Color(0xFF3B82F6),
            secondaryColor = Color(0xFF06B6D4),
            gradientColorsDark = listOf(Color(0xFF040C1A), Color(0xFF0A1C38), Color(0xFF0E2B54)),
            gradientColorsLight = listOf(Color(0xFFEFF6FF), Color(0xFFDBEAFE), Color(0xFFE0F2FE))
        ),
        LiveThemeVisual(
            id = LiveThemeId.SOLAR_MEADOW,
            nameEn = "Solar Meadow",
            nameBn = "সোলার মেডো",
            subtitleEn = "Sunlit citrus warmth with clean glass",
            accentColor = Color(0xFFEA580C),
            secondaryColor = Color(0xFFF59E0B),
            gradientColorsDark = listOf(Color(0xFF171007), Color(0xFF291D0B), Color(0xFF382910)),
            gradientColorsLight = listOf(Color(0xFFFFFBEB), Color(0xFFFFEDD5), Color(0xFFFEF9C3))
        ),
        LiveThemeVisual(
            id = LiveThemeId.CYBER_STUDIO,
            nameEn = "Neural Studio",
            nameBn = "নিউরাল স্টুডিও",
            subtitleEn = "Reactive dark obsidian with neural mesh",
            accentColor = Color(0xFF38BDF8),
            secondaryColor = Color(0xFF818CF8),
            gradientColorsDark = listOf(Color(0xFF05080F), Color(0xFF0D1424), Color(0xFF151E36)),
            gradientColorsLight = listOf(Color(0xFFF8FAFC), Color(0xFFEFF6FF), Color(0xFFE0E7FF))
        )
    )

    val defaultPlugins: List<PluginItem> = listOf(
        PluginItem(
            id = "plugin-web-search",
            name = "Live Web Grounding",
            category = "Search",
            description = "Real-time search indexing and source verification via SupremeAI Web.",
            descriptionBn = "রিয়েল-টাইম ওয়েব সার্চ ও তথ্য যাচাইকরণ।",
            isEnabled = true,
            latencyLabel = "~350 ms"
        ),
        PluginItem(
            id = "plugin-deep-research",
            name = "Deep Research Synthesizer",
            category = "Intelligence",
            description = "Multi-hop citation synthesis and structured report generation.",
            descriptionBn = "বহু-উৎস বিশ্লেষণ ও পূর্ণাঙ্গ রিসার্চ রিপোর্ট তৈরি।",
            isEnabled = true,
            latencyLabel = "~2.1 s"
        ),
        PluginItem(
            id = "plugin-artifact-sandbox",
            name = "HTML & Mermaid Sandbox",
            category = "Workspace",
            description = "Auto-extracts HTML, SVG, and Mermaid code blocks into the Workspace Dock.",
            descriptionBn = "HTML, SVG ও Mermaid কোড স্বয়ংক্রিয়ভাবে ওয়ার্কস্পেস ডকে প্রিভিউ করে।",
            isEnabled = true,
            latencyLabel = "Local"
        ),
        PluginItem(
            id = "plugin-voice-tts",
            name = "Bilingual Native Voice (EN/BN)",
            category = "Audio",
            description = "Zero-cost Tier-1 Android TextToSpeech & SpeechRecognizer voice cockpit.",
            descriptionBn = "জিরো-কস্ট বাংলা ও ইংরেজি ভয়েস স্পিচ ইঞ্জিন।",
            isEnabled = true,
            latencyLabel = "On-Device"
        ),
        PluginItem(
            id = "plugin-rag-knowledge",
            name = "Local Knowledge Vault (RAG)",
            category = "Memory",
            description = "Injects active workspace documents into chat context automatically.",
            descriptionBn = "অ্যাক্টিভ নলেজ ডকুমেন্ট স্বয়ংক্রিয়ভাবে চ্যাট কনটেক্সটে যুক্ত করে।",
            isEnabled = true,
            latencyLabel = "On-Device"
        ),
        PluginItem(
            id = "plugin-mcp-bridge",
            name = "MCP Tower Telemetry",
            category = "Federation",
            description = "Connects to SupremeAI MCP Tower for edge tool discovery and health metrics.",
            descriptionBn = "MCP টাওয়ারের মাধ্যমে ফেডারেশন টুল ও হেলথ মেট্রিক্স সংযুক্ত করে।",
            isEnabled = false,
            latencyLabel = "~420 ms",
            requiresAuth = true
        )
    )

    val defaultPromptTemplates: List<PromptTemplate> = listOf(
        PromptTemplate(
            id = "pt-arch-diagram",
            title = "System Architecture Blueprint",
            titleBn = "সিস্টেম আর্কিটেকচার ব্লুপ্রিন্ট",
            category = "Architecture",
            promptText = "Design a fault-tolerant architecture with API gateway, Redis rate-limiting, and multi-region failover. Include a Mermaid flowchart.",
            recommendedModelId = "supreme-reason"
        ),
        PromptTemplate(
            id = "pt-ui-artifact",
            title = "Interactive Dashboard Artifact",
            titleBn = "ইন্টারেক্টিভ ড্যাশবোর্ড আর্টিফ্যাক্ট",
            category = "Frontend",
            promptText = "Create a complete, self-contained HTML+CSS+JS interactive metrics dashboard with dark mode toggle and animated SVG sparklines.",
            recommendedModelId = "supreme-deep"
        ),
        PromptTemplate(
            id = "pt-deep-research",
            title = "Deep Market & Tech Research",
            titleBn = "ডিপ টেকনোলজি রিসার্চ",
            category = "Research",
            promptText = "Conduct a deep research analysis comparing edge neural inference vs cloud LLM gateways in 2026 with citations and latency benchmarks.",
            recommendedModelId = "supremeai-web"
        ),
        PromptTemplate(
            id = "pt-bn-bilingual",
            title = "Bengali Technical Explainer",
            titleBn = "বাংলা টেকনিক্যাল গাইড",
            category = "Bilingual",
            promptText = "Kubernetes Pod autoscaling (HPA vs VPA) সহজ বাংলায় উদাহরণ ও YAML কনফিগারেশনসহ বুঝিয়ে বলুন।",
            recommendedModelId = "supreme-core"
        ),
        PromptTemplate(
            id = "pt-security-audit",
            title = "API Security Checklist",
            titleBn = "এপিআই নিরাপত্তা অডিট",
            category = "Security",
            promptText = "Perform a zero-trust security audit checklist for mobile OAuth2 + Bearer JWT + Webhook HMAC verification.",
            recommendedModelId = "supreme-reason"
        )
    )

    val defaultKnowledgeDocs: List<KnowledgeDoc> = listOf(
        KnowledgeDoc(
            id = "kb-doctrine",
            title = "SupremeAI Local-First Doctrine",
            sourceType = "Policy",
            content = "SupremeAI Studio operates Local-First, Cloud-Optional. Local preferences, bilingual EN/BN localization, Tier-1 speech synthesis, and Room conversation storage always remain available offline.",
            tokenCount = 46,
            isActiveForGrounding = true
        ),
        KnowledgeDoc(
            id = "kb-gateway",
            title = "Federation Gateway Model Slugs",
            sourceType = "Markdown",
            content = "Supported native slugs: supreme-spark (ultra-fast), supreme-core (balanced), supreme-reason (deep-compute), supreme-deep (autonomous), supremeai-web (live search), supremeai-api (structured).",
            tokenCount = 38,
            isActiveForGrounding = true
        )
    )

    val defaultProjects: List<UserProject> = listOf(
        UserProject(
            id = "proj-studio-mobile",
            name = "supremeai-studio-android",
            description = "Local-first Android studio client with bilingual voice cockpit and live artifact dock.",
            repoUrl = "https://github.com/Supremeai-bd/supremeai-frontend",
            branch = "main",
            defaultModelId = "supreme-core",
            status = "Active"
        ),
        UserProject(
            id = "proj-route-arbiter",
            name = "dynamic-route-arbiter",
            description = "Multi-provider gateway latency scoring and automatic cooldown failover engine.",
            repoUrl = "https://github.com/Supremeai-bd/supremeai-gateway",
            branch = "production",
            defaultModelId = "supreme-reason",
            status = "Synced"
        )
    )

    val defaultTeamMembers: List<TeamMember> = listOf(
        TeamMember("tm-1", "Arafat Rahman", "arafat@supremeai.studio", "Owner", "Active", "Online now"),
        TeamMember("tm-2", "Nusrat Jahan", "nusrat@supremeai.studio", "Architect", "Active", "12m ago"),
        TeamMember("tm-3", "Tariqul Islam", "tariq@supremeai.studio", "Developer", "Active", "2h ago")
    )

    val defaultSchedules: List<ScheduledTask> = listOf(
        ScheduledTask("sch-1", "Gateway Latency Health Probe", "Every 15 min", "https://supremeai-api-ulw0.onrender.com/health", true, "Healthy (182ms)"),
        ScheduledTask("sch-2", "MCP Tower Service Discovery", "Hourly", "https://supremeai-mcp-tower.onrender.com/services", true, "Synced 6 tools")
    )

    val defaultMcpServices: List<McpServiceInfo> = listOf(
        McpServiceInfo("mcp-core", "SupremeAI Gateway Core", "https://supremeai-api-ulw0.onrender.com", "healthy", 184, 14, "us-east"),
        McpServiceInfo("mcp-tower", "MCP Federation Tower", "https://supremeai-mcp-tower.onrender.com", "healthy", 240, 9, "eu-central"),
        McpServiceInfo("mcp-rag", "Vector Grounding Node", "local://room-rag-index", "healthy", 12, 4, "on-device"),
        McpServiceInfo("mcp-speech", "Bilingual Voice Engine", "local://android-tts-sr", "healthy", 8, 2, "on-device")
    )

    val defaultHitlQueue: List<HitlApprovalItem> = listOf(
        HitlApprovalItem(
            id = "hitl-101",
            actionTitle = "Rotate Staging Gateway Key Pool",
            agentName = "Security Sentinel Agent",
            riskLevel = "HIGH",
            payloadPreview = "POST /api/admin/keys/rotate { pool: 'staging-alpha', graceMinutes: 30 }",
            requestedAtLabel = "4 mins ago"
        ),
        HitlApprovalItem(
            id = "hitl-102",
            actionTitle = "Promote supreme-reason Route Weight",
            agentName = "Route Arbiter Agent",
            riskLevel = "MEDIUM",
            payloadPreview = "PATCH /api/admin/gateway/weights { slug: 'supreme-reason', weight: 1.25 }",
            requestedAtLabel = "19 mins ago"
        )
    )

    val defaultCustomers: List<CustomerAccount> = listOf(
        CustomerAccount("cust-1", "Dhaka FinTech Labs", "ops@dhakafintech.io", PlanTier.ENTERPRISE, 4_820_000, "Healthy"),
        CustomerAccount("cust-2", "Bengal Cloud Systems", "platform@bengalcloud.dev", PlanTier.PRO, 640_000, "Healthy"),
        CustomerAccount("cust-3", "Aether Robotics", "ai@aetherbots.ai", PlanTier.PRO, 910_000, "Active"),
        CustomerAccount("cust-4", "Indie Studio Sandbox", "maker@indie.dev", PlanTier.FREE, 18_500, "Trial")
    )

    val defaultGatewayRoutes: List<GatewayRouteInfo> = listOf(
        GatewayRouteInfo("supreme-spark", "Spark Ultra-Fast Pool", 178, 99.94, "ONLINE"),
        GatewayRouteInfo("supreme-core", "Core Balanced Pool", 312, 99.89, "ONLINE"),
        GatewayRouteInfo("supreme-reason", "Reason Deep-Compute", 745, 99.72, "ONLINE"),
        GatewayRouteInfo("supreme-deep", "Autonomous Synthesis", 688, 99.81, "ONLINE"),
        GatewayRouteInfo("supremeai-web", "Live Web Grounding", 405, 99.65, "ONLINE")
    )

    val defaultAuditLogs: List<AuditLogEntry> = listOf(
        AuditLogEntry("aud-1", "Today 10:42", "System", "Local-First Room store initialized", "PASS"),
        AuditLogEntry("aud-2", "Today 10:38", "Arbiter", "Latency probe completed across 5 routes", "PASS"),
        AuditLogEntry("aud-3", "Today 09:15", "Admin", "Zero-trust HITL policy verified", "PASS")
    )

    val planPerks: Map<PlanTier, List<String>> = mapOf(
        PlanTier.FREE to listOf(
            "1,000 monthly studio credits",
            "Access to Spark, Core, Web & API models",
            "Unlimited offline Room history & bilingual voice",
            "Live HTML & Mermaid workspace preview"
        ),
        PlanTier.PRO to listOf(
            "25,000 monthly studio credits",
            "Unlocks SupremeAI Reason & SupremeAI Deep (2M+ ctx)",
            "Priority Dynamic Route Arbiter lanes",
            "Multi-document local RAG grounding & Prompt Library"
        ),
        PlanTier.ENTERPRISE to listOf(
            "250,000+ monthly studio credits",
            "Full Admin Control Center & HITL approvals",
            "Dedicated MCP Tower federation endpoints",
            "Team RBAC, Audit CSV & Custom SLA"
        )
    )
}
