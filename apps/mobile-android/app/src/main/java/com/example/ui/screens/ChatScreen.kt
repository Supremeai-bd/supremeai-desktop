package com.example.ui.screens

import android.content.Intent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.i18n.AppStrings
import com.example.ui.components.*
import com.example.ui.theme.LocalSupremeTokens
import com.example.viewmodel.StudioUiState
import com.example.viewmodel.StudioViewModel
import com.example.voice.VoiceStatus

@Composable
fun ChatScreen(
    uiState: StudioUiState,
    voiceStatus: VoiceStatus,
    voiceInputLevel: Float,
    voiceOutputLevel: Float,
    voiceTranscript: String,
    strings: AppStrings,
    viewModel: StudioViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val tokens = LocalSupremeTokens.current
    val activeSession = uiState.activeSession

    var showSearchBar by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var searchRoleFilter by remember { mutableStateOf("all") }
    var showExportMenu by remember { mutableStateOf(false) }

    val filteredMessages = remember(activeSession?.messages, searchQuery, searchRoleFilter) {
        val list = activeSession?.messages.orEmpty()
        list.filter { msg ->
            val roleOk = searchRoleFilter == "all" || msg.role == searchRoleFilter
            val q = searchQuery.trim().lowercase()
            val textOk = q.isEmpty() || msg.content.lowercase().contains(q)
            roleOk && textOk
        }
    }

    fun shareText(format: String) {
        val payload = viewModel.exportCurrentThread(format)
        if (payload.isBlank()) return
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, activeSession?.title ?: "SupremeAI Chat")
            putExtra(Intent.EXTRA_TEXT, payload)
        }
        context.startActivity(Intent.createChooser(sendIntent, "Share Conversation"))
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .imePadding()
    ) {
        // Thread Action Strip
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            AssistChip(
                onClick = { showSearchBar = !showSearchBar },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(16.dp)) },
                label = { Text("Search") },
                modifier = Modifier.testTag("thread_search_chip")
            )
            activeSession?.let { sess ->
                AssistChip(
                    onClick = { viewModel.togglePinSession(sess.id) },
                    leadingIcon = {
                        Icon(
                            if (sess.isPinned) Icons.Default.PushPin else Icons.Default.OutlinedFlag,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                    },
                    label = { Text(if (sess.isPinned) strings.pinned else strings.pin) },
                    modifier = Modifier.testTag("thread_pin_chip")
                )
            }
            AssistChip(
                onClick = { viewModel.branchSession() },
                leadingIcon = { Icon(Icons.Default.CallSplit, contentDescription = null, modifier = Modifier.size(16.dp)) },
                label = { Text(strings.branch) },
                modifier = Modifier.testTag("thread_branch_chip")
            )
            Box {
                AssistChip(
                    onClick = { showExportMenu = true },
                    leadingIcon = { Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp)) },
                    label = { Text(strings.exportBtn) },
                    modifier = Modifier.testTag("thread_export_chip")
                )
                DropdownMenu(expanded = showExportMenu, onDismissRequest = { showExportMenu = false }) {
                    DropdownMenuItem(text = { Text("Share Markdown") }, onClick = { showExportMenu = false; shareText("markdown") })
                    DropdownMenuItem(text = { Text("Share Plain Text") }, onClick = { showExportMenu = false; shareText("text") })
                    DropdownMenuItem(text = { Text("Share JSON") }, onClick = { showExportMenu = false; shareText("json") })
                }
            }
            AssistChip(
                onClick = { viewModel.toggleWorkspaceDock() },
                leadingIcon = { Icon(Icons.Default.Terminal, contentDescription = null, modifier = Modifier.size(16.dp)) },
                label = { Text(strings.workspaceDock) },
                modifier = Modifier.testTag("thread_dock_chip")
            )
            if (!activeSession?.messages.isNullOrEmpty()) {
                AssistChip(
                    onClick = { viewModel.clearCurrentThread() },
                    leadingIcon = { Icon(Icons.Default.DeleteSweep, contentDescription = null, modifier = Modifier.size(16.dp)) },
                    label = { Text(strings.clear) },
                    modifier = Modifier.testTag("thread_clear_chip")
                )
            }
        }

        // Context Banners
        if (uiState.impersonatedCustomer != null) {
            Surface(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
                shape = RoundedCornerShape(12.dp),
                color = tokens.warning.copy(alpha = 0.18f),
                border = BorderStroke(1.dp, tokens.warning.copy(alpha = 0.5f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Impersonating: ${uiState.impersonatedCustomer.name}", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                    TextButton(onClick = { viewModel.exitImpersonation() }) { Text("Exit") }
                }
            }
        } else if (uiState.platformConfig.announcementActive && uiState.platformConfig.announcementMessage.isNotBlank()) {
            Surface(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
                shape = RoundedCornerShape(12.dp),
                color = tokens.accent.copy(alpha = 0.16f)
            ) {
                Text(
                    uiState.platformConfig.announcementMessage,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(10.dp)
                )
            }
        }

        if (showSearchBar) {
            ChatSearchFilterBar(
                query = searchQuery,
                roleFilter = searchRoleFilter,
                strings = strings,
                onQueryChange = { searchQuery = it },
                onRoleFilterChange = { searchRoleFilter = it },
                onClose = { showSearchBar = false; searchQuery = "" }
            )
        }

        if (uiState.isLiveVoiceOpen) {
            LiveVoicePanel(
                voiceStatus = voiceStatus,
                inputLevel = voiceInputLevel,
                outputLevel = voiceOutputLevel,
                lastTranscript = voiceTranscript,
                avatarPreset = uiState.settings.avatarPreset,
                micSensitivity = uiState.settings.micSensitivity,
                voicePitch = uiState.settings.voicePitch,
                strings = strings,
                onStartListening = { viewModel.startVoiceListening() },
                onStopListening = { viewModel.voiceManager.stopListening() },
                onStopSpeaking = { viewModel.voiceManager.stopSpeaking() },
                onMicSensitivityChange = { viewModel.updateMicSensitivity(it) },
                onVoicePitchChange = { viewModel.updateVoicePitch(it) },
                onClose = { viewModel.toggleLiveVoice() }
            )
        }

        if (!uiState.inferenceError.isNullOrBlank()) {
            Surface(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
                shape = RoundedCornerShape(12.dp),
                color = tokens.danger.copy(alpha = 0.16f),
                border = BorderStroke(1.dp, tokens.danger.copy(alpha = 0.45f))
            ) {
                Row(
                    modifier = Modifier.padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = tokens.danger)
                    Text(uiState.inferenceError, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                }
            }
        }

        // Messages or Empty State
        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            if (activeSession == null || (activeSession.messages.isEmpty() && !uiState.isStreaming)) {
                ChatEmptyState(
                    userName = uiState.authUser?.name ?: uiState.settings.name,
                    activeRole = uiState.activeRole,
                    showTips = uiState.settings.showWorkspaceTips,
                    strings = strings,
                    onQuickPrompt = { prompt -> viewModel.sendMessage(prompt) },
                    onOpenRoleLab = { viewModel.setRoleModalOpen(true) },
                    onDismissTips = { viewModel.updateSettings { it.copy(showWorkspaceTips = false) } }
                )
            } else {
                ChatMessageList(
                    messages = filteredMessages,
                    streamingContent = uiState.streamingContent,
                    isStreaming = uiState.isStreaming,
                    strings = strings,
                    onReadAloud = { viewModel.speakText(it) },
                    onOpenCodeInWorkspace = { code, lang -> viewModel.openCodeInWorkspace(code, lang) },
                    onOpenBrowserUrl = { url -> viewModel.navigateBrowser(url, openDock = true) },
                    onBranchFromMessage = { msgId -> viewModel.branchSession(activeSession.id, msgId) }
                )
            }
        }

        ChatInputCapsule(
            activeModel = uiState.activeModel,
            autoModelRouting = uiState.settings.autoModelRouting,
            isStreaming = uiState.isStreaming,
            isLiveVoiceOpen = uiState.isLiveVoiceOpen,
            voiceStatus = voiceStatus,
            enableMultimodal = uiState.platformConfig.featureFlags["enable_multimodal_vision"] ?: true,
            pendingInsertion = uiState.pendingInputInsertion,
            strings = strings,
            onConsumePendingInsertion = { viewModel.consumePendingInputInsertion() },
            onSendMessage = { txt, att -> viewModel.sendMessage(txt, att) },
            onStopStreaming = { viewModel.stopStreaming() },
            onSelectModel = { viewModel.selectModel(it) },
            onToggleAutoRouting = { viewModel.setAutoModelRouting(it) },
            onToggleLiveVoice = { viewModel.toggleLiveVoice() },
            onOpenPromptLibrary = { viewModel.setPromptLibraryOpen(true) },
            modifier = Modifier.navigationBarsPadding()
        )
    }
}
