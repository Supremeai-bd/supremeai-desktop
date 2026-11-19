package com.example.ui.components

import android.net.Uri
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.data.SeedCatalog
import com.example.i18n.AppStrings
import com.example.model.*
import com.example.ui.theme.LocalSupremeTokens
import com.example.voice.VoiceStatus

@Composable
fun ChatEmptyState(
    userName: String,
    activeRole: RolePersona,
    showTips: Boolean,
    strings: AppStrings,
    onQuickPrompt: (String) -> Unit,
    onOpenRoleLab: () -> Unit,
    onDismissTips: () -> Unit,
    modifier: Modifier = Modifier
) {
    val tokens = LocalSupremeTokens.current
    val firstName = userName.substringBefore(" ").ifBlank { "Builder" }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp),
        contentPadding = PaddingValues(top = 28.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.img_studio_mark),
                        contentDescription = strings.appName,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(12.dp))
                    )
                    Surface(
                        onClick = onOpenRoleLab,
                        shape = RoundedCornerShape(20.dp),
                        color = tokens.accent.copy(alpha = 0.14f),
                        border = BorderStroke(1.dp, tokens.accent.copy(alpha = 0.4f)),
                        modifier = Modifier.testTag("empty_role_badge")
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.Psychology, contentDescription = null, tint = tokens.accent, modifier = Modifier.size(16.dp))
                            Text(activeRole.name, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }

                Text(
                    text = "${strings.emptyGreetingPrefix} $firstName?",
                    style = MaterialTheme.typography.displaySmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = activeRole.tagline,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        if (showTips) {
            item {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = tokens.glassSurface,
                    border = BorderStroke(1.dp, tokens.glassBorder)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Icon(Icons.Default.TipsAndUpdates, contentDescription = null, tint = tokens.warning)
                        Text(
                            "Tip: Ask for an HTML UI, Mermaid chart, or Deep Research report—Workspace Dock syncs live code & previews automatically.",
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = onDismissTips) {
                            Icon(Icons.Default.Close, contentDescription = "Dismiss tip", modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
        }

        items(activeRole.quickPrompts) { prompt ->
            Card(
                onClick = { onQuickPrompt(prompt) },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("quick_prompt_card"),
                colors = CardDefaults.cardColors(containerColor = tokens.glassSurface),
                border = BorderStroke(1.dp, tokens.glassBorder)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        prompt,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(Modifier.width(8.dp))
                    Icon(
                        Icons.Default.ArrowOutward,
                        contentDescription = null,
                        tint = tokens.accent,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun ChatSearchFilterBar(
    query: String,
    roleFilter: String,
    strings: AppStrings,
    onQueryChange: (String) -> Unit,
    onRoleFilterChange: (String) -> Unit,
    onClose: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.85f)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = query,
                    onValueChange = onQueryChange,
                    placeholder = { Text(strings.chatSearchPlaceholder) },
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    modifier = Modifier.weight(1f).testTag("chat_search_input")
                )
                IconButton(onClick = onClose, modifier = Modifier.testTag("chat_search_close_btn")) {
                    Icon(Icons.Default.Close, contentDescription = strings.close)
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("all" to strings.filterAll, "user" to strings.filterYou, "assistant" to strings.filterAi).forEach { (key, label) ->
                    FilterChip(
                        selected = roleFilter == key,
                        onClick = { onRoleFilterChange(key) },
                        label = { Text(label) }
                    )
                }
            }
        }
    }
}

@Composable
fun ChatMessageList(
    messages: List<ChatMessage>,
    streamingContent: String,
    isStreaming: Boolean,
    strings: AppStrings,
    onReadAloud: (String) -> Unit,
    onOpenCodeInWorkspace: (code: String, lang: String) -> Unit,
    onOpenBrowserUrl: (String) -> Unit,
    onBranchFromMessage: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()
    LaunchedEffect(messages.size, streamingContent.length) {
        if (messages.isNotEmpty() || isStreaming) {
            val targetIndex = ((messages.size + if (isStreaming) 1 else 0) - 1).coerceAtLeast(0)
            listState.animateScrollToItem(targetIndex)
        }
    }

    LazyColumn(
        state = listState,
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(messages, key = { it.id }) { msg ->
            ChatMessageCard(
                message = msg,
                strings = strings,
                onReadAloud = onReadAloud,
                onOpenCodeInWorkspace = onOpenCodeInWorkspace,
                onOpenBrowserUrl = onOpenBrowserUrl,
                onBranchFromMessage = onBranchFromMessage
            )
        }

        if (isStreaming) {
            item(key = "streaming_bubble") {
                ChatMessageCard(
                    message = ChatMessage(
                        id = "streaming",
                        role = "assistant",
                        content = streamingContent.ifBlank { strings.generatingLabel },
                        roleName = "SupremeAI"
                    ),
                    strings = strings,
                    isStreamingNow = true,
                    onReadAloud = {},
                    onOpenCodeInWorkspace = onOpenCodeInWorkspace,
                    onOpenBrowserUrl = onOpenBrowserUrl,
                    onBranchFromMessage = {}
                )
            }
        }
    }
}

private sealed class ContentSegment {
    data class TextBlock(val text: String) : ContentSegment()
    data class CodeBlock(val lang: String, val code: String) : ContentSegment()
}

private fun parseMessageSegments(content: String): List<ContentSegment> {
    val regex = Regex("```([a-zA-Z0-9_-]*)\\n([\\s\\S]*?)```")
    val segments = mutableListOf<ContentSegment>()
    var cursor = 0
    regex.findAll(content).forEach { match ->
        if (match.range.first > cursor) {
            val prefix = content.substring(cursor, match.range.first).trim()
            if (prefix.isNotEmpty()) segments.add(ContentSegment.TextBlock(prefix))
        }
        val lang = match.groupValues[1].ifBlank { "text" }
        val code = match.groupValues[2].trimEnd()
        segments.add(ContentSegment.CodeBlock(lang, code))
        cursor = match.range.last + 1
    }
    if (cursor < content.length) {
        val tail = content.substring(cursor).trim()
        if (tail.isNotEmpty()) segments.add(ContentSegment.TextBlock(tail))
    }
    if (segments.isEmpty()) segments.add(ContentSegment.TextBlock(content))
    return segments
}

@Composable
private fun ChatMessageCard(
    message: ChatMessage,
    strings: AppStrings,
    isStreamingNow: Boolean = false,
    onReadAloud: (String) -> Unit,
    onOpenCodeInWorkspace: (code: String, lang: String) -> Unit,
    onOpenBrowserUrl: (String) -> Unit,
    onBranchFromMessage: (String) -> Unit
) {
    val tokens = LocalSupremeTokens.current
    val clipboard = LocalClipboardManager.current
    val isUser = message.role == "user"
    val segments = remember(message.content) { parseMessageSegments(message.content) }

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
    ) {
        Surface(
            modifier = Modifier.widthIn(max = 580.dp),
            shape = RoundedCornerShape(
                topStart = 18.dp,
                topEnd = 18.dp,
                bottomStart = if (isUser) 18.dp else 4.dp,
                bottomEnd = if (isUser) 4.dp else 18.dp
            ),
            color = if (isUser) tokens.accent.copy(alpha = 0.22f) else tokens.glassSurface,
            border = BorderStroke(
                1.dp,
                if (isUser) tokens.accent.copy(alpha = 0.45f) else tokens.glassBorder
            )
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = if (isUser) "You" else (message.roleName ?: "SupremeAI"),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = if (isUser) tokens.accent else MaterialTheme.colorScheme.primary
                    )
                    message.model?.let { modelId ->
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f)
                        ) {
                            Text(
                                modelId,
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                    if (isStreamingNow) {
                        CircularProgressIndicator(modifier = Modifier.size(12.dp), strokeWidth = 1.8.dp)
                    }
                }

                message.attachment?.let { att ->
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.AttachFile, contentDescription = null, modifier = Modifier.size(15.dp))
                            Text(att.name, style = MaterialTheme.typography.labelSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }

                segments.forEach { seg ->
                    when (seg) {
                        is ContentSegment.TextBlock -> {
                            Text(
                                text = seg.text,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        is ContentSegment.CodeBlock -> {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = tokens.codeBackground,
                                border = BorderStroke(1.dp, tokens.glassBorder)
                            ) {
                                Column {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .background(Color.White.copy(alpha = 0.05f))
                                            .padding(horizontal = 10.dp, vertical = 4.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(seg.lang.uppercase(), style = MaterialTheme.typography.labelSmall, color = tokens.accent)
                                        Row {
                                            TextButton(
                                                onClick = { onOpenCodeInWorkspace(seg.code, seg.lang) },
                                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                                            ) {
                                                Text("Workspace", style = MaterialTheme.typography.labelSmall)
                                            }
                                            TextButton(
                                                onClick = { clipboard.setText(AnnotatedString(seg.code)) },
                                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                                            ) {
                                                Text(strings.copyBtn, style = MaterialTheme.typography.labelSmall)
                                            }
                                        }
                                    }
                                    Text(
                                        text = seg.code,
                                        fontFamily = FontFamily.Monospace,
                                        fontSize = 12.sp,
                                        lineHeight = 17.sp,
                                        color = tokens.codeText,
                                        modifier = Modifier
                                            .padding(10.dp)
                                            .horizontalScroll(rememberScrollState())
                                    )
                                }
                            }
                        }
                    }
                }

                message.researchReport?.let { report ->
                    ResearchReportCard(report = report)
                }

                message.browserNavigation?.let { nav ->
                    AssistChip(
                        onClick = { onOpenBrowserUrl(nav.url) },
                        leadingIcon = { Icon(Icons.Default.Public, contentDescription = null, modifier = Modifier.size(16.dp)) },
                        label = { Text("Open ${nav.hostname} in Workspace") }
                    )
                }

                if (!isUser && !isStreamingNow) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        IconButton(
                            onClick = { onReadAloud(message.content) },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(Icons.Default.VolumeUp, contentDescription = strings.readAloud, modifier = Modifier.size(18.dp))
                        }
                        IconButton(
                            onClick = { clipboard.setText(AnnotatedString(message.content)) },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(Icons.Default.ContentCopy, contentDescription = strings.copyBtn, modifier = Modifier.size(18.dp))
                        }
                        IconButton(
                            onClick = { onBranchFromMessage(message.id) },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(Icons.Default.CallSplit, contentDescription = strings.branch, modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ResearchReportCard(report: ResearchReport) {
    val tokens = LocalSupremeTokens.current
    var expanded by remember { mutableStateOf(false) }

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = tokens.accentSecondary.copy(alpha = 0.12f),
        border = BorderStroke(1.dp, tokens.accentSecondary.copy(alpha = 0.35f))
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded },
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Science, contentDescription = null, tint = tokens.accentSecondary)
                    Text("Deep Research (${report.sections.size} sections)", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                }
                Icon(if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore, contentDescription = "Toggle research sections")
            }

            if (expanded) {
                report.sections.forEach { sec ->
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(sec.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Text(sec.content, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    HorizontalDivider(color = tokens.glassBorder)
                }
                if (report.sources.isNotEmpty()) {
                    Text("Sources:", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    report.sources.forEach { src ->
                        Text("• ${src.title} (${src.url})", style = MaterialTheme.typography.labelSmall, color = tokens.accent)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatInputCapsule(
    activeModel: ModelDetail,
    autoModelRouting: Boolean,
    isStreaming: Boolean,
    isLiveVoiceOpen: Boolean,
    voiceStatus: VoiceStatus,
    enableMultimodal: Boolean,
    pendingInsertion: String?,
    strings: AppStrings,
    onConsumePendingInsertion: () -> Unit,
    onSendMessage: (String, ChatAttachment?) -> Unit,
    onStopStreaming: () -> Unit,
    onSelectModel: (ModelDetail) -> Unit,
    onToggleAutoRouting: (Boolean) -> Unit,
    onToggleLiveVoice: () -> Unit,
    onOpenPromptLibrary: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val tokens = LocalSupremeTokens.current
    var text by remember { mutableStateOf("") }
    var attachment by remember { mutableStateOf<ChatAttachment?>(null) }
    var showPlusMenu by remember { mutableStateOf(false) }
    var showModelSheet by remember { mutableStateOf(false) }

    LaunchedEffect(pendingInsertion) {
        if (!pendingInsertion.isNullOrBlank()) {
            text = pendingInsertion
            onConsumePendingInsertion()
        }
    }

    fun readUriAttachment(uri: Uri, fallbackName: String, defaultMime: String) {
        runCatching {
            val mime = context.contentResolver.getType(uri) ?: defaultMime
            val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return
            val encoded = Base64.encodeToString(bytes.take(2_000_000).toByteArray(), Base64.NO_WRAP)
            val dataUri = "data:$mime;base64,$encoded"
            val name = uri.lastPathSegment?.substringAfterLast('/') ?: fallbackName
            attachment = ChatAttachment(name = name, mimeType = mime, dataUri = dataUri)
        }
    }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        uri?.let { readUriAttachment(it, "image.jpg", "image/jpeg") }
    }

    val filePickerLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        uri?.let { readUriAttachment(it, "document.txt", "text/plain") }
    }

    if (showModelSheet) {
        ModalBottomSheet(onDismissRequest = { showModelSheet = false }) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 18.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(strings.autoModelTitle, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(strings.autoModelDesc, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(
                        checked = autoModelRouting,
                        onCheckedChange = { onToggleAutoRouting(it) },
                        modifier = Modifier.testTag("auto_model_switch")
                    )
                }
                HorizontalDivider()
                SeedCatalog.MODELS.forEach { model ->
                    val selected = !autoModelRouting && model.id == activeModel.id
                    Card(
                        onClick = {
                            onSelectModel(model)
                            showModelSheet = false
                        },
                        colors = CardDefaults.cardColors(
                            containerColor = if (selected) tokens.accent.copy(alpha = 0.14f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)
                        ),
                        border = BorderStroke(1.dp, if (selected) tokens.accent else tokens.glassBorder),
                        modifier = Modifier.fillMaxWidth().testTag("model_pick_${model.id}")
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text(model.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                                    AssistChip(onClick = {}, label = { Text(model.latencyRating, style = MaterialTheme.typography.labelSmall) })
                                }
                                Text(model.tagline, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            if (selected) Icon(Icons.Default.CheckCircle, contentDescription = "Selected", tint = tokens.accent)
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
            }
        }
    }

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        shape = RoundedCornerShape(24.dp),
        color = tokens.glassSurface,
        border = BorderStroke(1.dp, tokens.glassBorder)
    ) {
        Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            attachment?.let { att ->
                InputChip(
                    selected = true,
                    onClick = {},
                    label = { Text(att.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    leadingIcon = { Icon(Icons.Default.AttachFile, contentDescription = null, modifier = Modifier.size(16.dp)) },
                    trailingIcon = {
                        IconButton(onClick = { attachment = null }, modifier = Modifier.size(20.dp)) {
                            Icon(Icons.Default.Close, contentDescription = "Remove attachment", modifier = Modifier.size(14.dp))
                        }
                    }
                )
            }

            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                placeholder = {
                    Text(
                        when {
                            attachment != null -> strings.attachmentPlaceholder
                            isLiveVoiceOpen -> strings.voicePlaceholder
                            else -> strings.askPlaceholder
                        },
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                },
                maxLines = 5,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color.Transparent,
                    unfocusedBorderColor = Color.Transparent
                ),
                modifier = Modifier.fillMaxWidth().testTag("chat_prompt_input")
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Box {
                        IconButton(
                            onClick = { showPlusMenu = true },
                            modifier = Modifier.testTag("chat_plus_menu_btn")
                        ) {
                            Icon(Icons.Default.AddCircleOutline, contentDescription = "Attachments and recipes")
                        }
                        DropdownMenu(expanded = showPlusMenu, onDismissRequest = { showPlusMenu = false }) {
                            if (enableMultimodal) {
                                DropdownMenuItem(
                                    text = { Text("Attach Photo") },
                                    leadingIcon = { Icon(Icons.Default.Image, contentDescription = null) },
                                    onClick = {
                                        showPlusMenu = false
                                        photoPickerLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                                    }
                                )
                                DropdownMenuItem(
                                    text = { Text(strings.uploadFileOption) },
                                    leadingIcon = { Icon(Icons.Default.UploadFile, contentDescription = null) },
                                    onClick = {
                                        showPlusMenu = false
                                        filePickerLauncher.launch(arrayOf("text/*", "application/pdf", "application/json"))
                                    }
                                )
                            }
                            DropdownMenuItem(
                                text = { Text(strings.browseRecipesOption) },
                                leadingIcon = { Icon(Icons.Default.AutoAwesome, contentDescription = null) },
                                onClick = {
                                    showPlusMenu = false
                                    onOpenPromptLibrary()
                                }
                            )
                            DropdownMenuItem(
                                text = { Text(strings.starterBuildAppTitle) },
                                leadingIcon = { Icon(Icons.Default.Code, contentDescription = null) },
                                onClick = {
                                    showPlusMenu = false
                                    text = strings.starterBuildAppPrompt
                                }
                            )
                            DropdownMenuItem(
                                text = { Text(strings.starterResearchTitle) },
                                leadingIcon = { Icon(Icons.Default.Science, contentDescription = null) },
                                onClick = {
                                    showPlusMenu = false
                                    text = strings.starterResearchPrompt
                                }
                            )
                        }
                    }

                    AssistChip(
                        onClick = { showModelSheet = true },
                        label = {
                            Text(
                                if (autoModelRouting) strings.autoModelBadge else activeModel.name.removePrefix("SupremeAI "),
                                style = MaterialTheme.typography.labelMedium
                            )
                        },
                        leadingIcon = {
                            Icon(
                                if (autoModelRouting) Icons.Default.AutoAwesome else Icons.Default.Memory,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                        },
                        modifier = Modifier.testTag("model_selector_chip")
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    FilledTonalIconButton(
                        onClick = onToggleLiveVoice,
                        colors = IconButtonDefaults.filledTonalIconButtonColors(
                            containerColor = if (isLiveVoiceOpen) tokens.accent.copy(alpha = 0.25f) else MaterialTheme.colorScheme.surfaceVariant
                        ),
                        modifier = Modifier.testTag("toggle_voice_btn")
                    ) {
                        Icon(
                            imageVector = if (voiceStatus == VoiceStatus.SPEAKING) Icons.Default.GraphicEq else Icons.Default.Mic,
                            contentDescription = strings.voiceBtn,
                            tint = if (isLiveVoiceOpen) tokens.accent else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    if (isStreaming) {
                        FilledIconButton(
                            onClick = onStopStreaming,
                            colors = IconButtonDefaults.filledIconButtonColors(containerColor = tokens.danger),
                            modifier = Modifier.testTag("stop_streaming_btn")
                        ) {
                            Icon(Icons.Default.Stop, contentDescription = "Stop generating", tint = Color.White)
                        }
                    } else {
                        FilledIconButton(
                            onClick = {
                                val current = text
                                val att = attachment
                                if (current.isNotBlank() || att != null) {
                                    text = ""
                                    attachment = null
                                    onSendMessage(current, att)
                                }
                            },
                            enabled = text.isNotBlank() || attachment != null,
                            colors = IconButtonDefaults.filledIconButtonColors(containerColor = tokens.accent),
                            modifier = Modifier.testTag("send_message_btn")
                        ) {
                            Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send", tint = Color.White)
                        }
                    }
                }
            }
        }
    }
}
