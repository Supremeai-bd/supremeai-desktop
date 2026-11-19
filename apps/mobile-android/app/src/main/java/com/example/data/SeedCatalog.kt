package com.example.data

import com.example.model.*

object SeedCatalog {
    const val DEFAULT_API_BASE_URL = "https://supremeai-api-ulw0.onrender.com"
    const val DEFAULT_MCP_TOWER_URL = "https://supremeai-mcp-tower.onrender.com"

    val MODELS: List<ModelDetail> = listOf(
        ModelDetail(
            id = "supreme-spark",
            name = "SupremeAI Spark",
            alias = "Ultra-Low Latency",
            badge = "Recommended",
            tagline = "Instant snippets, rapid turnaround & sub-second completions",
            description = "Featherweight, rapid turnaround model designed for high-frequency interactions, instant responses, and sub-second completions.",
            idealFor = "Rapid chat, coding, syntax conversions, regex, and instantaneous lookups",
            latencyRating = "Ultra-Fast",
            contextTokens = "1,000,000+",
            reasoningCapability = "High",
            tier = "standard",
            accentColorHex = 0xFFF59E0B
        ),
        ModelDetail(
            id = "supreme-core",
            name = "SupremeAI Core",
            alias = "Flagship Intelligence",
            badge = "Standard",
            tagline = "High-throughput multimodal foundation intelligence",
            description = "Versatile reasoning, full-stack conversational coding, structured analysis, and instant problem solving.",
            idealFor = "Everyday engineering tasks, full-stack development, and architecture Q&A",
            latencyRating = "Balanced",
            contextTokens = "1,000,000+",
            reasoningCapability = "High",
            tier = "standard",
            accentColorHex = 0xFF06B6D4
        ),
        ModelDetail(
            id = "supreme-reason",
            name = "SupremeAI Reason",
            alias = "Deep Analytical Engine",
            badge = "Deep Compute",
            tagline = "Deep reasoning, mathematical proofs & root-cause debugging",
            description = "Engineered for hard algorithm synthesis, distributed system invariants, formal logic, and architectural failure mode auditing.",
            idealFor = "Complex algorithmic logic, security audits, and mission-critical reasoning",
            latencyRating = "Deep-Compute",
            contextTokens = "2,000,000+",
            reasoningCapability = "Extreme",
            tier = "advanced",
            accentColorHex = 0xFF8B5CF6
        ),
        ModelDetail(
            id = "supreme-deep",
            name = "SupremeAI Deep",
            alias = "Agentic Orchestration",
            badge = "Autonomous",
            tagline = "Complex interactive coding & multi-agent swarms",
            description = "Specialized for large multi-file refactoring, autonomous agent workflows, terminal loop execution, and deep repository inspection.",
            idealFor = "Multi-step autonomous tasks, large refactors, and complex agentic jobs",
            latencyRating = "Deep-Compute",
            contextTokens = "2,000,000+",
            reasoningCapability = "Extreme",
            tier = "advanced",
            accentColorHex = 0xFF10B981
        ),
        ModelDetail(
            id = "supremeai-web",
            name = "SupremeAI Web",
            alias = "Stealth Webpool",
            badge = "Zero-Cost Web",
            tagline = "Stealth web session relay via cookie pool",
            description = "Direct $0 cookie-authenticated web session relay for uninterrupted high-volume web queries and search synthesis.",
            idealFor = "Web scraping, live search synthesis, zero-token cost streaming",
            latencyRating = "Balanced",
            contextTokens = "1,000,000+",
            reasoningCapability = "High",
            tier = "standard",
            accentColorHex = 0xFF3B82F6
        ),
        ModelDetail(
            id = "supremeai-api",
            name = "SupremeAI API",
            alias = "Multi-Cloud API Squad",
            badge = "Enterprise API",
            tagline = "High-availability multi-key provider pool",
            description = "Direct load-balanced multi-provider API squad across Gemini, Groq, OpenRouter, Mistral, and Hugging Face.",
            idealFor = "Mission-critical enterprise completions, production APIs, guaranteed failover",
            latencyRating = "Ultra-Fast",
            contextTokens = "2,000,000+",
            reasoningCapability = "Extreme",
            tier = "standard",
            accentColorHex = 0xFFF43F5E
        )
    )

    val ROLES: List<RolePersona> = listOf(
        RolePersona(
            id = "supreme-general",
            name = "Supreme Generalist",
            badge = "General",
            tagline = "Versatile AI engineering partner for all core tasks",
            description = "Balanced intelligence with sharp technical insight, clean code generation, and rapid conceptual synthesis.",
            suggestedModel = "supreme-core",
            systemInstruction = "You are SupremeAI, an expert technical partner from Supremeai-bd. Provide concise, clean, and production-ready responses. Structure code with clear types, avoid unnecessary fluff, and present actionable solutions.",
            quickPrompts = listOf(
                "How should I structure a modular AI studio client?",
                "Explain the capabilities of SupremeAI Core vs SupremeAI Reason.",
                "Draft an offline-first state persistence architecture.",
                "Write a clean retry wrapper with exponential backoff."
            )
        ),
        RolePersona(
            id = "supreme-architect",
            name = "Systems Architect",
            badge = "Deep Reasoning",
            tagline = "Deep reasoning, architectural design & failure mode analysis",
            description = "Rigorous decomposition of complex distributed systems, state machines, microservices, and concurrency models.",
            suggestedModel = "supreme-reason",
            systemInstruction = "You are SupremeAI Lead Architect. Analyze invariants, failure boundaries, latency trade-offs, and scalability bottlenecks. Format into: 1. Core Principles, 2. Architecture & Data Flow, 3. Invariants & Failure Modes, 4. Concrete Implementation.",
            quickPrompts = listOf(
                "Design a zero-latency real-time collaboration architecture.",
                "Analyze failure modes of client-side vs server-side SSE streaming.",
                "Propose an offline-first caching topology for mobile AI apps.",
                "How do we synchronize state across distributed edge nodes?"
            )
        ),
        RolePersona(
            id = "supreme-fullstack",
            name = "Full-Stack Specialist",
            badge = "Interactive",
            tagline = "Complex interactive UI, TypeScript, Compose & APIs",
            description = "Expert in modern reactive UI, strict typing, Express/Edge APIs, and ergonomic developer UX.",
            suggestedModel = "supreme-deep",
            systemInstruction = "You are SupremeAI Full-Stack Specialist. Write idiomatic, modular code with crisp UI, zero dead clicks, clean error boundaries, and optimal performance.",
            quickPrompts = listOf(
                "Build a responsive SaaS analytics dashboard in HTML/JS.",
                "Create a streaming SSE parser with cancellation support.",
                "Design a rate-limiting API gateway middleware.",
                "Build an interactive Mermaid architecture diagram."
            )
        ),
        RolePersona(
            id = "supreme-fast-dev",
            name = "Fast Code Synthesizer",
            badge = "Fast",
            tagline = "Instant snippets, regex, shell commands & quick refactoring",
            description = "Featherweight, rapid turnaround for high-frequency queries, script generation, and syntax transformations.",
            suggestedModel = "supreme-spark",
            systemInstruction = "You are SupremeAI Rapid Synthesizer. Prioritize speed, precision, and zero preamble. Give direct code snippets, commands, or regular expressions without redundant padding.",
            quickPrompts = listOf(
                "Write a bash command to count lines across source files.",
                "Provide a regex for semantic version strings with pre-release.",
                "Convert a JSON payload into Kotlin @Serializable data classes.",
                "Give me a coroutine debounce helper function."
            )
        ),
        RolePersona(
            id = "supreme-security",
            name = "Security & Code Auditor",
            badge = "Auditing",
            tagline = "Vulnerability assessment, sanitization & defense in depth",
            description = "Zero-trust verification, XSS prevention, SSRF defense, secret leakage checks, and OWASP compliance.",
            suggestedModel = "supreme-reason",
            systemInstruction = "You are SupremeAI Security Auditor. Audit provided code and architecture for vulnerabilities, injection vectors, unauthenticated access, and sensitive data leakage. Provide concrete remediation patches.",
            quickPrompts = listOf(
                "Audit an API proxy endpoint for SSRF and injection flaws.",
                "How should AI-generated markdown be sanitized safely?",
                "Review OAuth Bearer token handling and refresh security.",
                "What are the security risks of untrusted HTML previews?"
            )
        )
    )

    val PLANS: Map<PlanTier, PlanSpec> = mapOf(
        PlanTier.FREE to PlanSpec(PlanTier.FREE, 0, 100_000L, 1, 20, "32k"),
        PlanTier.PRO to PlanSpec(PlanTier.PRO, 29, 1_000_000L, 10, 120, "128k"),
        PlanTier.ENTERPRISE to PlanSpec(PlanTier.ENTERPRISE, 199, 5_000_000L, 50, 600, "1M")
    )

    val TOPUP_PACKAGES: List<TopUpPackage> = listOf(
        TopUpPackage("topup-10", 10, 250_000L),
        TopUpPackage("topup-50", 50, 1_500_000L, "Popular"),
        TopUpPackage("topup-200", 200, 7_500_000L, "Best Value")
    )

    val INITIAL_PLUGINS: List<PluginItem> = listOf(
        PluginItem("github-sync", "GitHub Project Bridge", "Sync branches, pull requests, and commit diffs with SupremeAI", "Links connected GitHub repositories to chat context so you can inspect commits and file trees.", "developer", true, "1.4.2", "Supremeai-bd"),
        PluginItem("ai-code-auditor", "AI Code Reviewer", "Automatic pull request reviews and vulnerability scanning", "Analyzes submitted code blocks and pull requests for security issues and edge cases.", "security", true, "2.1.0", "Supremeai-bd"),
        PluginItem("web-grounding", "Search & Docs Grounding", "Ground answers in latest web docs and live library releases", "Augments SupremeAI responses with real-time documentation and package references.", "ai-grounding", true, "1.8.0", "Supremeai-bd"),
        PluginItem("terminal-assistant", "Terminal & CLI Companion", "Generate and validate shell commands, Docker scripts & CI/CD", "Translates natural language into POSIX-compliant bash, Dockerfile, and GitHub Actions.", "developer", false, "1.2.5", "Supremeai-bd"),
        PluginItem("markdown-export-pro", "Notion & Doc Exporter", "Export chat conversations and technical specs into clean docs", "Formatted export of chat threads, architectural diagrams, and snippets to Markdown or JSON.", "productivity", true, "1.0.8", "SupremeAI Community"),
        PluginItem("figma-code-bridge", "Design Token Bridge", "Generate clean UI code from design specifications", "Converts design component specs and tokens into responsive UI components.", "developer", false, "0.9.4", "Supremeai-bd")
    )

    val INITIAL_PROJECTS: List<UserProject> = listOf(
        UserProject("proj_supremeai_core", "supremeai", "https://github.com/Supremeai-bd/supremeai", "main", "Core AI engine, model orchestration, and backend agent services.", "TypeScript / Python", 28, System.currentTimeMillis() - 14_400_000L, "reviewed"),
        UserProject("proj_supremeai_studio", "supremeai-studio", "https://github.com/Supremeai-bd/supremeai-frontend", "main", "Ultra-lightweight SupremeAI developer studio & workspace.", "Kotlin / Compose", 42, System.currentTimeMillis() - 7_200_000L, "reviewed")
    )

    val INITIAL_API_KEYS: List<ApiKeyItem> = listOf(
        ApiKeyItem("key_prod_01", "SupremeAI Studio Production CLI", "supremeai", "sk-supreme-live-4a8f", "sk-supreme-live-4a8f••••••••9c2b", "2026-03-12", "2 minutes ago", 600, "active", "healthy", "2 mins ago", listOf("chat:write", "models:read", "knowledge:read", "agents:invoke")),
        ApiKeyItem("key_gemini_02", "Google AI Studio (Gemini Flash Primary)", "google_ai_studio", "AIzaSyD4k8", "AIzaSyD4k8••••••••••••3M_9k", "2026-04-01", "5 minutes ago", 360, "active", "healthy", "Just now", listOf("chat:write", "models:read", "knowledge:read")),
        ApiKeyItem("key_openai_03", "OpenAI GPT-4o Fallback Bridge", "openai", "sk-proj-94a1", "sk-proj-94a1••••••••••••8e2d", "2026-04-08", "18 minutes ago", 240, "active", "healthy", "12 mins ago", listOf("chat:write", "models:read")),
        ApiKeyItem("key_anthropic_04", "Anthropic Claude Sonnet Review Worker", "anthropic", "sk-ant-api03", "sk-ant-api03••••••••••••9e1f", "2026-04-12", "1 hour ago", 120, "active", "degraded", "1 hour ago", listOf("chat:write", "agents:invoke")),
        ApiKeyItem("key_groq_05", "Groq LPU Ultra-Fast Synthesis", "groq", "gsk_92af4", "gsk_92af4••••••••••••41b8", "2026-04-20", "25 minutes ago", 480, "active", "healthy", "4 mins ago", listOf("chat:write", "models:read"))
    )

    val INITIAL_WEBHOOKS: List<WebhookItem> = listOf(
        WebhookItem("wh_slack_01", "Slack Dev Channel Alerts", "https://hooks.slack.com/services/T00/B00/EXAMPLE", listOf("chat.completed", "agent.finished", "token.threshold_warning"), "whsec_example_slack", true, "14 minutes ago (200 OK)", 0),
        WebhookItem("wh_github_02", "GitHub Repository Auto-PR Auditor", "https://example.com/webhooks/github-prs", listOf("code.analyzed", "security.alert_detected"), "whsec_example_github", true, "2 hours ago (200 OK)", 0)
    )

    val INITIAL_WEBHOOK_DELIVERIES: List<WebhookDeliveryLog> = listOf(
        WebhookDeliveryLog("del_01", "wh_slack_01", "chat.completed", "Today at 10:48:12", 200, 142, """{"event":"chat.completed","model":"supreme-core","tokens":840}""", true),
        WebhookDeliveryLog("del_02", "wh_github_02", "code.analyzed", "Today at 09:20:04", 200, 310, """{"event":"code.analyzed","pr":94,"findings":0}""", true),
        WebhookDeliveryLog("del_03", "wh_slack_01", "token.threshold_warning", "Yesterday at 16:30:00", 504, 5000, """{"event":"token.threshold_warning","usedPercent":82}""", false)
    )

    val INITIAL_KNOWLEDGE_DOCS: List<KnowledgeDoc> = listOf(
        KnowledgeDoc("doc_arch_01", "SupremeAI Core Architecture Spec v2.4.md", "markdown", 142_000, 28_400, 32, "indexed", "Today at 09:15", true, "# SupremeAI Core Architecture\nHigh-throughput agent orchestration layer interacting with SupremeAI Core and SupremeAI Reason through WebSocket broker and SSE transport."),
        KnowledgeDoc("doc_mcp_02", "Model Context Protocol (MCP) Integration Guide.pdf", "pdf", 420_000, 64_200, 74, "indexed", "Yesterday", true, "MCP specification compliance guidelines: JSON-RPC stdio and SSE transport protocols for local tools and dynamic context caching."),
        KnowledgeDoc("doc_code_03", "Supremeai-bd/supremeai Service Handlers.ts", "code", 88_400, 19_800, 24, "indexed", "3 days ago", false, "Microservice definitions for auth-token-prober, sse-stream-broker, and supreme-inference-gateway with resilient circuit breakers."),
        KnowledgeDoc("doc_audit_04", "Security Hardening & RBAC Rules.md", "markdown", 54_000, 11_200, 14, "indexed", "5 days ago", true, "Zero-trust policy definitions, prompt injection defense mechanisms, and customer token quota isolation rules.")
    )

    val INITIAL_TEAM_MEMBERS: List<TeamMember> = listOf(
        TeamMember("member_01", "Workspace Owner", "owner@example.com", "W", "Owner", "Jan 2026", true, "active"),
        TeamMember("member_02", "Sarah Chen", "sarah.chen@example.com", "S", "Developer", "Feb 2026", true, "active"),
        TeamMember("member_03", "Rafiqul Islam", "rafiqul@example.com", "R", "Reviewer", "Mar 2026", true, "active"),
        TeamMember("member_04", "Alex Johnson", "alex.j@example.com", "A", "Viewer", "Apr 2026", false, "active")
    )

    val INITIAL_INVOICES: List<BillingInvoice> = listOf(
        BillingInvoice("inv_2026_04", "INV-2026-004", "Apr 01, 2026", 29.0, "paid", "Pro (Monthly)"),
        BillingInvoice("inv_2026_03", "INV-2026-003", "Mar 01, 2026", 29.0, "paid", "Pro (Monthly)"),
        BillingInvoice("inv_2026_topup", "TOP-2026-118", "Feb 18, 2026", 50.0, "paid", "Pay-As-You-Go Credits (1.5M Tokens)"),
        BillingInvoice("inv_2026_02", "INV-2026-002", "Feb 01, 2026", 29.0, "paid", "Pro (Monthly)")
    )

    val MODEL_USAGE_BREAKDOWN: List<ModelUsageSlice> = listOf(
        ModelUsageSlice("SupremeAI Core", 680_000L, 54, "$0.68", 0xFF3B82F6),
        ModelUsageSlice("SupremeAI Reason", 340_000L, 27, "$1.70", 0xFF8B5CF6),
        ModelUsageSlice("SupremeAI Spark", 190_000L, 15, "$0.15", 0xFF10B981),
        ModelUsageSlice("SupremeAI Deep", 50_000L, 4, "$0.40", 0xFFF59E0B)
    )

    val INITIAL_PROMPT_TEMPLATES: List<PromptTemplateItem> = listOf(
        PromptTemplateItem("tmpl_gen_01", "Executive Summary & Key Action Items", "research", "Turn long meeting notes, reports, or articles into clear takeaways and next steps.", "Summarize the key points, decisions made, and clear next action items from the following notes:\n\n[PASTE NOTES HERE]", listOf("summary", "notes", "productivity")),
        PromptTemplateItem("tmpl_gen_02", "Clear & Professional Email Polish", "writing", "Refine rough drafts into polite, concise, and persuasive emails or announcements.", "Rewrite the following draft to be clear, warm, and concise for a professional audience:\n\n[PASTE DRAFT HERE]", listOf("writing", "email", "clarity")),
        PromptTemplateItem("tmpl_gen_03", "Structured Brainstorm & Pros/Cons Matrix", "general", "Explore options for a business decision with clear trade-offs and recommendations.", "Help me evaluate options for the following decision. Provide 3 practical approaches, pros/cons, and a next step:\n\n[DESCRIBE GOAL HERE]", listOf("brainstorm", "planning", "strategy")),
        PromptTemplateItem("tmpl_01", "Strict Security Audit & OWASP Fuzz", "security", "Inspect endpoints, auth middleware, and input sanitization against Top 10 risks.", "Perform a comprehensive security audit on the following code. Check for injection, auth bypass, and OWASP Top 10 risks:\n\n```\n[PASTE CODE HERE]\n```", listOf("security", "audit", "owasp")),
        PromptTemplateItem("tmpl_02", "Strict Schema & Type Guard Design", "code", "Generate strict data models, validation parsers, and error handling.", "Design clean, strict data models and runtime validation guards for this JSON payload:\n\n```json\n[PASTE JSON HERE]\n```", listOf("types", "schema", "validation")),
        PromptTemplateItem("tmpl_03", "Distributed System Architectural Review", "architecture", "Analyze microservices for split-brain risks, idempotency, and backpressure.", "Review this microservice orchestration design for idempotency, dead-letter fallback, and backpressure:\n\n[DESCRIBE ARCHITECTURE HERE]", listOf("architecture", "microservices", "reliability")),
        PromptTemplateItem("tmpl_04", "Modern UI Component Refactor", "review", "Refactor UI code for clean state flow, accessibility, and zero re-render bloat.", "Refactor the following UI component for clean state management, accessibility, and responsive layout:\n\n```\n[PASTE COMPONENT HERE]\n```", listOf("refactor", "ui", "clean-code"))
    )

    val INITIAL_CUSTOMERS: List<CustomerRecord> = listOf(
        CustomerRecord("cust_01", "Dhaka Cloud Labs", "ops@dhakacloud.bd", PlanTier.ENTERPRISE, "active", 199, 2_840_000L, 5_000_000L, 12, "2026-01-12", "4 mins ago", "dhaka-cloud", "ap-southeast-1", true),
        CustomerRecord("cust_02", "Apex FinTech BD", "eng@apexfin.io", PlanTier.PRO, "active", 29, 640_000L, 1_000_000L, 5, "2026-02-04", "18 mins ago", "apex-fin", "ap-south-1", true),
        CustomerRecord("cust_03", "Nova Studio Collective", "team@novastudio.dev", PlanTier.PRO, "active", 29, 412_000L, 1_000_000L, 3, "2026-03-19", "1 hour ago", "nova-studio", "us-east-1", false),
        CustomerRecord("cust_04", "Indie Researcher", "aria@research.org", PlanTier.FREE, "active", 0, 48_000L, 100_000L, 1, "2026-04-02", "3 hours ago", null, "eu-west-1", false)
    )

    val INITIAL_MCP_SERVICES: List<McpTowerService> = listOf(
        McpTowerService("render-primary", "render-primary", "Render Primary (Core API)", "core", 8000, "healthy", "99.94%", 84, 18.2, 312, "Just now", "v2.4.0", "$DEFAULT_API_BASE_URL/api/health", 0, listOf(McpServiceLog("l1", "10:42:11", "INFO", "SSE inference stream pool warm (12 active routes)"))),
        McpTowerService("render-worker", "render-worker", "Render Worker (Async Tasks)", "core", 8001, "healthy", "99.89%", 112, 22.5, 428, "Just now", "v2.4.0", "$DEFAULT_API_BASE_URL/api/v1/health", 0, listOf(McpServiceLog("l2", "10:40:02", "INFO", "Background embedding queue drained"))),
        McpTowerService("render-scraper", "render-scraper", "Render Scraper (Browser/Webpool)", "integration", 8002, "healthy", "99.72%", 195, 14.0, 256, "Just now", "v2.3.8", "$DEFAULT_API_BASE_URL/api/workspace/browser-proxy", 1, listOf(McpServiceLog("l3", "10:35:40", "WARN", "Cookie pool rotated 1 expired session"))),
        McpTowerService("render-mcp", "render-mcp", "Render MCP (Control Tower)", "telemetry", 8003, "healthy", "99.98%", 62, 11.4, 198, "Just now", "v2.4.0", "$DEFAULT_MCP_TOWER_URL/health", 0, listOf(McpServiceLog("l4", "10:43:00", "INFO", "Federated bridge agent heartbeat OK"))),
        McpTowerService("render-api", "render-api", "Render API (Gateway Shield)", "ai", 8004, "degraded", "99.41%", 240, 34.8, 512, "1m ago", "v2.4.0", "$DEFAULT_API_BASE_URL/v1/models", 2, listOf(McpServiceLog("l5", "10:41:18", "WARN", "Failover triggered from primary key #2 to Groq squad")))
    )

    val INITIAL_SWARM_WORKERS: List<SwarmWorker> = listOf(
        SwarmWorker("worker-solver-01", "Autonomous Solver Agent", "solver", "active", "Resolving Issue #42: Backpressure in WebSocket stream broker", "Supremeai-bd/supremeai #42", 184, 97.8, 18.4, 412, "14h 22m", listOf("Identified unbounded buffer allocation", "Generated circular ring-buffer patch", "34 unit tests passing")),
        SwarmWorker("worker-verifier-02", "AST Code Verifier & Validator", "verifier", "active", "Running AST graph verification on PR #94", "Supremeai-bd/supremeai-studio #94", 312, 99.4, 9.2, 280, "28h 10m", listOf("AST tree generated for 84 modules", "0 circular dependencies detected")),
        SwarmWorker("worker-scout-03", "Ecosystem Scout & Dependency Tracker", "ecosystem-scout", "idle", "Awaiting scheduled 15-minute package crawl", "Continuous background crawler", 94, 100.0, 1.1, 145, "42h 50m", listOf("Checked SDK compatibility", "0 upstream security advisories")),
        SwarmWorker("worker-security-04", "Adversarial Prompt & Rules Breaker", "rules-breaker", "active", "Fuzzing prompt boundaries with 500 jailbreak vectors", "Adversarial Test Suite #19", 780, 99.8, 24.6, 520, "19h 45m", listOf("Delimiter extraction payload blocked", "System instruction override sanitized"))
    )

    val INITIAL_QUEUE_JOBS: List<TaskQueueJob> = listOf(
        TaskQueueJob("job_901", "ai-reasoning", "deep_research", "Distributed FinOps latency analysis", "completed", 1, 3, 2840, "2 mins ago"),
        TaskQueueJob("job_902", "github-sync", "repo_index", "Supremeai-bd/supremeai main branch AST", "active", 1, 3, 620, "Just now"),
        TaskQueueJob("job_903", "code-audit", "pr_security_scan", "PR #94 auth middleware audit", "waiting", 0, 3, 0, "1 min ago"),
        TaskQueueJob("job_904", "vector-embedding", "rag_chunk_embed", "MCP Integration Guide PDF chunks", "dlq", 3, 3, 5100, "18 mins ago", "Upstream embedding timeout (504)")
    )

    val INITIAL_SCHEMA_TABLES: List<SchemaParityTable> = listOf(
        SchemaParityTable("tbl_01", "users_accounts", 14, 14, 14, false, null, true, "2026-04-18"),
        SchemaParityTable("tbl_02", "chat_sessions", 11, 11, 11, false, null, true, "2026-04-18"),
        SchemaParityTable("tbl_03", "provider_route_metrics", 9, 9, 8, true, "Prod missing latency_p99 column", true, "2026-04-10"),
        SchemaParityTable("tbl_04", "knowledge_vectors", 8, 8, 8, false, null, true, "2026-04-15")
    )

    val INITIAL_GATEWAY_ROUTES: List<LlmGatewayRoute> = listOf(
        LlmGatewayRoute("rt_spark", "supreme-spark", "SupremeAI Spark", "Groq LPU", "Gemini Flash", 145, 0.2, 420, 0.08, 0.24, 0.50, true),
        LlmGatewayRoute("rt_core", "supreme-core", "SupremeAI Core", "Gemini Pro", "OpenAI GPT-4o", 380, 0.4, 310, 0.35, 1.05, 1.50, true),
        LlmGatewayRoute("rt_reason", "supreme-reason", "SupremeAI Reason", "Gemini Thinking", "Claude Sonnet", 920, 0.6, 85, 1.25, 5.00, 6.50, true),
        LlmGatewayRoute("rt_deep", "supreme-deep", "SupremeAI Deep", "Claude Sonnet", "DeepSeek R1", 1140, 0.5, 62, 1.50, 6.00, 7.50, true)
    )

    val INITIAL_SECURITY_EVENTS: List<SecurityEventLog> = listOf(
        SecurityEventLog("sec_01", "10:38:12", "high", "prompt_injection", "185.220.101.44", "guest-trial@anon", "Attempted system prompt extraction via nested markdown fence", true),
        SecurityEventLog("sec_02", "09:54:03", "medium", "rate_limit_exceeded", "45.88.192.12", "bot-probe@scan", "Exceeded 60 RPM guest trial threshold on /api/v1/stream/chat", true),
        SecurityEventLog("sec_03", "08:12:49", "low", "token_spike", "103.144.201.9", "ops@dhakacloud.bd", "Burst 42k context window inference from Enterprise tenant", false)
    )

    val INITIAL_AUDIT_RECORDS: List<SystemAuditRecord> = listOf(
        SystemAuditRecord("aud_01", "Today 10:15", "admin@supremeai.bd", "GATEWAY_FAILOVER_ENABLED", "supreme-core", "Enabled automatic Groq -> Gemini failover", "10.0.14.2"),
        SystemAuditRecord("aud_02", "Today 09:02", "admin@supremeai.bd", "FEATURE_FLAG_UPDATED", "enable_deep_research", "Set global flag to true", "10.0.14.2"),
        SystemAuditRecord("aud_03", "Yesterday 18:40", "system-arbiter", "KEY_COOLDOWN_ROTATION", "key_anthropic_04", "Rotated key into 5m cooldown after 429 spike", "127.0.0.1")
    )

    val INITIAL_FEATURE_FLAGS: List<FeatureFlagItem> = listOf(
        FeatureFlagItem("enable_multimodal_vision", "Multimodal Vision & Document Upload", "Allow image and document attachments in chat input", true, "multimodal"),
        FeatureFlagItem("enable_deep_research", "Deep Research Pipeline", "Multi-step empirical synthesis & structured citation reports", true, "agents"),
        FeatureFlagItem("enable_live_voice", "3D Hologram Live Voice Mode", "Bilingual EN/বাংলা Speech-to-Text and TTS voice companion", true, "multimodal"),
        FeatureFlagItem("enable_workspace_dock", "Interactive Workspace Dock", "Live code artifact extraction, HTML/Mermaid preview, browser & scheduler", true, "models")
    )

    val INITIAL_PROVIDER_KEYS: List<ProviderKeyItem> = listOf(
        ProviderKeyItem("pk_01", "google_ai_studio", "Google AI Studio Primary", "AIzaSyD4••••••••3M_9k", "healthy", 164, 1, "Just now", "1,000,000 TPM"),
        ProviderKeyItem("pk_02", "groq", "Groq LPU Inference Squad", "gsk_92af••••••••41b8", "healthy", 92, 2, "1m ago", "500,000 TPM"),
        ProviderKeyItem("pk_03", "openai", "OpenAI Fallback Pool", "sk-proj-••••••••8e2d", "healthy", 285, 3, "2m ago", "400,000 TPM"),
        ProviderKeyItem("pk_04", "anthropic", "Anthropic Claude Squad", "sk-ant-••••••••9e1f", "degraded", 440, 4, "4m ago", "200,000 TPM")
    )

    val INITIAL_BLOCKED_IPS: List<BlockedIpRecord> = listOf(
        BlockedIpRecord("185.220.101.44", "Automated prompt injection scanner", "2026-04-20"),
        BlockedIpRecord("45.88.192.12", "Repeated rate-limit flood", "2026-04-19")
    )

    val ECOSYSTEM_REPOS: List<EcosystemRepo> = listOf(
        EcosystemRepo("Supremeai-bd/supremeai", "https://github.com/Supremeai-bd/supremeai", "Core multi-provider LLM gateway, DynamicRouteArbiter, and agentic orchestration backend.", "TypeScript / Python / FastAPI", "Active · Main"),
        EcosystemRepo("Supremeai-bd/supremeai-frontend", "https://github.com/Supremeai-bd/supremeai-frontend", "SupremeAI Studio satellite workspace with bilingual EN/বাংলা support and live voice companion.", "Kotlin / Jetpack Compose", "Active · Android"),
        EcosystemRepo("Supremeai-bd/supremeai-mcp-tower", "https://github.com/Supremeai-bd/supremeai-mcp-tower", "Federated MCP service tower, health telemetry collector, and autonomous swarm bridge.", "Node.js / MCP RPC", "Healthy")
    )
}
