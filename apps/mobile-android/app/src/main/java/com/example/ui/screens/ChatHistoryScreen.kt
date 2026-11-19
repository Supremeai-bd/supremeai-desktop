package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.i18n.AppStrings
import com.example.model.ChatSession
import com.example.ui.theme.LocalSupremeTokens
import com.example.viewmodel.StudioUiState
import com.example.viewmodel.StudioViewModel

@Composable
fun ChatHistoryScreen(
    uiState: StudioUiState,
    strings: AppStrings,
    viewModel: StudioViewModel,
    onOpenChat: () -> Unit,
    modifier: Modifier = Modifier
) {
    val tokens = LocalSupremeTokens.current
    var query by remember { mutableStateOf("") }
    var filterMode by remember { mutableStateOf("all") }
    var renameTarget by remember { mutableStateOf<ChatSession?>(null) }
    var renameText by remember { mutableStateOf("") }

    val filtered = remember(uiState.sessions, query, filterMode) {
        uiState.sessions.filter { session ->
            val modeOk = when (filterMode) {
                "pinned" -> session.isPinned
                "messages" -> session.messages.isNotEmpty()
                else -> true
            }
            val q = query.trim().lowercase()
            val textOk = q.isEmpty() ||
                session.title.lowercase().contains(q) ||
                session.messages.any { it.content.lowercase().contains(q) }
            modeOk && textOk
        }
    }

    renameTarget?.let { target ->
        AlertDialog(
            onDismissRequest = { renameTarget = null },
            title = { Text("Rename Conversation") },
            text = {
                OutlinedTextField(
                    value = renameText,
                    onValueChange = { renameText = it },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(onClick = {
                    viewModel.renameSession(target.id, renameText)
                    renameTarget = null
                }) { Text("Save") }
            },
            dismissButton = {
                TextButton(onClick = { renameTarget = null }) { Text("Cancel") }
            }
        )
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(strings.allConversations, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text(strings.historySubtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            FilledTonalButton(
                onClick = {
                    viewModel.createNewSession()
                    onOpenChat()
                },
                modifier = Modifier.testTag("history_new_chat_btn")
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text(strings.startNewChat)
            }
        }

        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text(strings.historySearchPlaceholder) },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().testTag("history_search_input")
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(
                "all" to strings.filterAll,
                "pinned" to strings.filterPinned,
                "messages" to strings.filterWithMessages
            ).forEach { (key, label) ->
                FilterChip(
                    selected = filterMode == key,
                    onClick = { filterMode = key },
                    label = { Text(label) }
                )
            }
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(bottom = 24.dp)
        ) {
            items(filtered, key = { it.id }) { session ->
                val isCurrent = session.id == uiState.activeSessionId
                Card(
                    onClick = {
                        viewModel.selectSession(session.id)
                        onOpenChat()
                    },
                    colors = CardDefaults.cardColors(
                        containerColor = if (isCurrent) tokens.accent.copy(alpha = 0.14f) else tokens.glassSurface
                    ),
                    border = BorderStroke(1.dp, if (isCurrent) tokens.accent else tokens.glassBorder),
                    modifier = Modifier.fillMaxWidth().testTag("history_card_${session.id}")
                ) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                modifier = Modifier.weight(1f),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                if (session.isPinned) {
                                    Icon(Icons.Default.PushPin, contentDescription = "Pinned", tint = tokens.accent, modifier = Modifier.size(16.dp))
                                }
                                Text(
                                    session.title,
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant
                            ) {
                                Text(
                                    "${session.messages.size} msgs",
                                    style = MaterialTheme.typography.labelSmall,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }

                        val preview = session.messages.lastOrNull()?.content ?: "Empty session · ${session.model}"
                        Text(
                            preview,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End
                        ) {
                            IconButton(onClick = { viewModel.togglePinSession(session.id) }) {
                                Icon(Icons.Default.PushPin, contentDescription = "Toggle pin", modifier = Modifier.size(18.dp))
                            }
                            IconButton(onClick = {
                                renameText = session.title
                                renameTarget = session
                            }) {
                                Icon(Icons.Default.Edit, contentDescription = "Rename", modifier = Modifier.size(18.dp))
                            }
                            IconButton(onClick = {
                                viewModel.branchSession(session.id)
                                onOpenChat()
                            }) {
                                Icon(Icons.Default.CallSplit, contentDescription = "Branch", modifier = Modifier.size(18.dp))
                            }
                            IconButton(onClick = { viewModel.deleteSession(session.id) }) {
                                Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}
