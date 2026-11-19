package com.example.ui.components

import android.annotation.SuppressLint
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.example.i18n.AppStrings
import com.example.model.ScheduledTaskItem
import com.example.ui.theme.LocalSupremeTokens
import com.example.viewmodel.WorkspaceDockState
import com.example.viewmodel.WorkspaceDockTab

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkspaceDockSheet(
    dockState: WorkspaceDockState,
    schedules: List<ScheduledTaskItem>,
    strings: AppStrings,
    onSelectTab: (WorkspaceDockTab) -> Unit,
    onNavigateBrowser: (String) -> Unit,
    onAddSchedule: (title: String, url: String, cadence: String, instruction: String) -> Unit,
    onToggleSchedule: (String) -> Unit,
    onDeleteSchedule: (String) -> Unit,
    onRunTerminalCommand: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val tokens = LocalSupremeTokens.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surface,
        dragHandle = { BottomSheetDefaults.DragHandle() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.88f)
                .navigationBarsPadding()
                .padding(horizontal = 16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Terminal, contentDescription = null, tint = tokens.accent)
                    Text(strings.workspaceDock, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    if (dockState.isArtifactStreaming) {
                        AssistChip(
                            onClick = {},
                            label = { Text("Live Sync", style = MaterialTheme.typography.labelSmall) }
                        )
                    }
                }
                IconButton(onClick = onDismiss, modifier = Modifier.testTag("dock_close_btn")) {
                    Icon(Icons.Default.Close, contentDescription = strings.closeDock)
                }
            }

            Spacer(Modifier.height(6.dp))

            ScrollableTabRow(
                selectedTabIndex = dockState.activeTab.ordinal,
                edgePadding = 0.dp
            ) {
                WorkspaceDockTab.entries.forEach { tab ->
                    val label = when (tab) {
                        WorkspaceDockTab.PREVIEW -> strings.dockPreview
                        WorkspaceDockTab.CODE -> strings.dockCode
                        WorkspaceDockTab.BROWSER -> strings.dockBrowser
                        WorkspaceDockTab.SCHEDULE -> strings.dockSchedule
                        WorkspaceDockTab.TERMINAL -> strings.dockTerminal
                    }
                    Tab(
                        selected = dockState.activeTab == tab,
                        onClick = { onSelectTab(tab) },
                        text = { Text(label) },
                        modifier = Modifier.testTag("dock_tab_${tab.name.lowercase()}")
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                when (dockState.activeTab) {
                    WorkspaceDockTab.PREVIEW -> ArtifactPreviewPane(dockState)
                    WorkspaceDockTab.CODE -> ArtifactCodePane(dockState, strings)
                    WorkspaceDockTab.BROWSER -> WorkspaceBrowserPane(dockState, onNavigateBrowser)
                    WorkspaceDockTab.SCHEDULE -> WorkspaceSchedulePane(
                        schedules = schedules,
                        defaultUrl = dockState.browserUrl,
                        onAddSchedule = onAddSchedule,
                        onToggleSchedule = onToggleSchedule,
                        onDeleteSchedule = onDeleteSchedule
                    )
                    WorkspaceDockTab.TERMINAL -> WorkspaceTerminalPane(
                        logs = dockState.terminalLogs,
                        onRunCommand = onRunTerminalCommand
                    )
                }
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun ArtifactPreviewPane(dockState: WorkspaceDockState) {
    val tokens = LocalSupremeTokens.current
    if (dockState.artifactCode.isBlank()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Web, contentDescription = null, modifier = Modifier.size(44.dp), tint = tokens.accent)
                Text("No live preview artifact yet", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Text(
                    "Ask SupremeAI to build an HTML UI, dashboard, SVG, or Mermaid diagram and it will render here live.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        return
    }

    val htmlPayload = remember(dockState.artifactCode, dockState.artifactLanguage) {
        when (dockState.artifactLanguage.lowercase()) {
            "mermaid" -> """
                <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
                <script type="module">import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';mermaid.initialize({startOnLoad:true,theme:'dark'});</script>
                <style>body{background:#090d16;color:#e2e8f0;font-family:sans-serif;padding:16px;margin:0;}</style>
                </head><body><pre class="mermaid">${dockState.artifactCode}</pre></body></html>
            """.trimIndent()
            "svg" -> """
                <!DOCTYPE html><html><body style="background:#090d16;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;">
                ${dockState.artifactCode}</body></html>
            """.trimIndent()
            else -> dockState.artifactCode
        }
    }

    AndroidView(
        factory = { ctx ->
            WebView(ctx).apply {
                settings.javaScriptEnabled = true
                settings.allowFileAccess = false
                settings.domStorageEnabled = true
                webViewClient = WebViewClient()
                loadDataWithBaseURL("https://localhost/", htmlPayload, "text/html", "utf-8", null)
            }
        },
        update = { webView ->
            webView.loadDataWithBaseURL("https://localhost/", htmlPayload, "text/html", "utf-8", null)
        },
        modifier = Modifier.fillMaxSize()
    )
}

@Composable
private fun ArtifactCodePane(dockState: WorkspaceDockState, strings: AppStrings) {
    val tokens = LocalSupremeTokens.current
    val clipboard = LocalClipboardManager.current
    var copied by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            AssistChip(onClick = {}, label = { Text(dockState.artifactLanguage.uppercase()) })
            FilledTonalButton(
                onClick = {
                    clipboard.setText(AnnotatedString(dockState.artifactCode))
                    copied = true
                },
                enabled = dockState.artifactCode.isNotBlank(),
                modifier = Modifier.testTag("dock_copy_code_btn")
            ) {
                Icon(if (copied) Icons.Default.Check else Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text(if (copied) strings.copiedBtn else strings.copyBtn)
            }
        }
        Surface(
            modifier = Modifier.weight(1f).fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            color = tokens.codeBackground,
            border = BorderStroke(1.dp, tokens.glassBorder)
        ) {
            Text(
                text = dockState.artifactCode.ifBlank { "// Code artifacts from assistant responses will stream here." },
                fontFamily = FontFamily.Monospace,
                fontSize = 12.sp,
                lineHeight = 18.sp,
                color = tokens.codeText,
                modifier = Modifier
                    .padding(14.dp)
                    .verticalScroll(rememberScrollState())
                    .horizontalScroll(rememberScrollState())
            )
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun WorkspaceBrowserPane(
    dockState: WorkspaceDockState,
    onNavigate: (String) -> Unit
) {
    var urlInput by remember(dockState.browserUrl) { mutableStateOf(dockState.browserUrl) }
    var webViewRef by remember { mutableStateOf<WebView?>(null) }

    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = urlInput,
                onValueChange = { urlInput = it },
                singleLine = true,
                placeholder = { Text("https://...") },
                modifier = Modifier.weight(1f).testTag("dock_browser_url_input")
            )
            FilledIconButton(
                onClick = { onNavigate(urlInput) },
                modifier = Modifier.testTag("dock_browser_go_btn")
            ) {
                Icon(Icons.Default.ArrowForward, contentDescription = "Go")
            }
            IconButton(onClick = { webViewRef?.reload() }) {
                Icon(Icons.Default.Refresh, contentDescription = "Reload")
            }
        }

        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            dockState.browserHistory.forEach { histUrl ->
                AssistChip(
                    onClick = { onNavigate(histUrl) },
                    label = { Text(histUrl.removePrefix("https://").take(26)) }
                )
            }
        }

        AndroidView(
            factory = { ctx ->
                WebView(ctx).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.allowFileAccess = false
                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean = false
                    }
                    loadUrl(dockState.browserUrl)
                    webViewRef = this
                }
            },
            update = { webView ->
                if (webView.url != dockState.browserUrl) {
                    webView.loadUrl(dockState.browserUrl)
                }
            },
            modifier = Modifier.weight(1f).fillMaxWidth()
        )
    }
}

@Composable
private fun WorkspaceSchedulePane(
    schedules: List<ScheduledTaskItem>,
    defaultUrl: String,
    onAddSchedule: (title: String, url: String, cadence: String, instruction: String) -> Unit,
    onToggleSchedule: (String) -> Unit,
    onDeleteSchedule: (String) -> Unit
) {
    val tokens = LocalSupremeTokens.current
    var title by remember { mutableStateOf("") }
    var targetUrl by remember { mutableStateOf(defaultUrl) }
    var cadence by remember { mutableStateOf("daily") }
    var instruction by remember { mutableStateOf("") }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)),
                border = BorderStroke(1.dp, tokens.glassBorder)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Create Automated Task", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    OutlinedTextField(
                        value = title,
                        onValueChange = { title = it },
                        label = { Text("Task Title") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().testTag("schedule_title_input")
                    )
                    OutlinedTextField(
                        value = targetUrl,
                        onValueChange = { targetUrl = it },
                        label = { Text("Target URL") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("hourly", "daily", "weekly").forEach { c ->
                            FilterChip(
                                selected = cadence == c,
                                onClick = { cadence = c },
                                label = { Text(c.replaceFirstChar { it.uppercase() }) }
                            )
                        }
                    }
                    OutlinedTextField(
                        value = instruction,
                        onValueChange = { instruction = it },
                        label = { Text("Agent Instruction") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 2
                    )
                    Button(
                        onClick = {
                            if (title.isNotBlank()) {
                                onAddSchedule(title, targetUrl, cadence, instruction.ifBlank { "Check updates" })
                                title = ""; instruction = ""
                            }
                        },
                        enabled = title.isNotBlank(),
                        modifier = Modifier.fillMaxWidth().testTag("schedule_add_btn")
                    ) {
                        Icon(Icons.Default.Schedule, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Add Schedule")
                    }
                }
            }
        }

        if (schedules.isEmpty()) {
            item {
                Text(
                    "No scheduled monitors yet. You can also ask in chat: \"monitor https://example.com every day\".",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(8.dp)
                )
            }
        }

        items(schedules, key = { it.id }) { task ->
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)),
                border = BorderStroke(1.dp, tokens.glassBorder)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(task.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Text("${task.cadence.uppercase()} · ${task.cronExpression}", style = MaterialTheme.typography.labelSmall, color = tokens.accent)
                        Text(task.targetUrl, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(checked = task.enabled, onCheckedChange = { onToggleSchedule(task.id) })
                    IconButton(onClick = { onDeleteSchedule(task.id) }) {
                        Icon(Icons.Default.DeleteOutline, contentDescription = "Delete schedule")
                    }
                }
            }
        }
    }
}

@Composable
private fun WorkspaceTerminalPane(
    logs: List<String>,
    onRunCommand: (String) -> Unit
) {
    val tokens = LocalSupremeTokens.current
    var command by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            listOf("help", "models", "probe", "clear").forEach { cmd ->
                AssistChip(onClick = { onRunCommand(cmd) }, label = { Text(cmd) })
            }
        }

        Surface(
            modifier = Modifier.weight(1f).fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            color = Color(0xFF05080F),
            border = BorderStroke(1.dp, tokens.glassBorder)
        ) {
            LazyColumn(
                modifier = Modifier.padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(logs) { line ->
                    Text(
                        line,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 12.sp,
                        color = if (line.startsWith("$")) Color(0xFF38BDF8) else Color(0xFFA7F3D0)
                    )
                }
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = command,
                onValueChange = { command = it },
                placeholder = { Text("Enter workspace command...") },
                singleLine = true,
                modifier = Modifier.weight(1f).testTag("terminal_cmd_input")
            )
            FilledIconButton(
                onClick = {
                    if (command.isNotBlank()) {
                        onRunCommand(command)
                        command = ""
                    }
                },
                modifier = Modifier.testTag("terminal_run_btn")
            ) {
                Icon(Icons.Default.PlayArrow, contentDescription = "Run command")
            }
        }
    }
}
