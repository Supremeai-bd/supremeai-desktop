package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.i18n.AppStrings
import com.example.ui.theme.LocalSupremeTokens
import com.example.viewmodel.StudioUiState
import com.example.viewmodel.StudioViewModel

@Composable
fun ApiKeysScreen(
    uiState: StudioUiState,
    strings: AppStrings,
    viewModel: StudioViewModel,
    modifier: Modifier = Modifier
) {
    val tokens = LocalSupremeTokens.current
    var tabIndex by remember { mutableIntStateOf(0) }
    var showCreateKey by remember { mutableStateOf(false) }
    var showCreateWebhook by remember { mutableStateOf(false) }
    var showDeliveries by remember { mutableStateOf(false) }

    var keyName by remember { mutableStateOf("") }
    var keyProvider by remember { mutableStateOf("supremeai") }
    var keySecret by remember { mutableStateOf("") }

    var whName by remember { mutableStateOf("") }
    var whUrl by remember { mutableStateOf("") }

    if (showCreateKey) {
        AlertDialog(
            onDismissRequest = { showCreateKey = false },
            title = { Text("Add API Key / Provider Bridge") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = keyName, onValueChange = { keyName = it }, label = { Text("Key Label") }, singleLine = true)
                    OutlinedTextField(value = keyProvider, onValueChange = { keyProvider = it }, label = { Text("Provider (supremeai, gemini, openai, groq)") }, singleLine = true)
                    OutlinedTextField(value = keySecret, onValueChange = { keySecret = it }, label = { Text("API Secret") }, singleLine = true)
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (keyName.isNotBlank()) {
                        viewModel.addApiKey(keyName, keyProvider, keySecret)
                        keyName = ""; keySecret = ""; showCreateKey = false
                    }
                }) { Text("Save Key") }
            },
            dismissButton = { TextButton(onClick = { showCreateKey = false }) { Text("Cancel") } }
        )
    }

    if (showCreateWebhook) {
        AlertDialog(
            onDismissRequest = { showCreateWebhook = false },
            title = { Text("Register Webhook") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = whName, onValueChange = { whName = it }, label = { Text("Webhook Name") }, singleLine = true)
                    OutlinedTextField(value = whUrl, onValueChange = { whUrl = it }, label = { Text("Endpoint URL (https://...)") }, singleLine = true)
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (whName.isNotBlank() && whUrl.isNotBlank()) {
                        viewModel.addWebhook(whName, whUrl, listOf("chat.completed", "agent.finished"))
                        whName = ""; whUrl = ""; showCreateWebhook = false
                    }
                }) { Text("Create") }
            },
            dismissButton = { TextButton(onClick = { showCreateWebhook = false }) { Text("Cancel") } }
        )
    }

    if (showDeliveries) {
        AlertDialog(
            onDismissRequest = { showDeliveries = false },
            title = { Text("Webhook Delivery Logs") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    uiState.webhookDeliveries.forEach { d ->
                        Column {
                            Text("${d.eventType} · HTTP ${d.statusCode} (${d.latencyMs}ms)", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                            Text(d.timestamp, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        HorizontalDivider()
                    }
                }
            },
            confirmButton = { TextButton(onClick = { showDeliveries = false }) { Text(strings.close) } }
        )
    }

    Column(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(strings.apiKeysProviders, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            FilledTonalButton(
                onClick = { if (tabIndex == 0) showCreateKey = true else showCreateWebhook = true },
                modifier = Modifier.testTag("apikeys_add_btn")
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(4.dp))
                Text(if (tabIndex == 0) "New Key" else "New Webhook")
            }
        }

        TabRow(selectedTabIndex = tabIndex) {
            Tab(selected = tabIndex == 0, onClick = { tabIndex = 0 }, text = { Text("API Keys (${uiState.apiKeys.size})") })
            Tab(selected = tabIndex == 1, onClick = { tabIndex = 1 }, text = { Text("Webhooks (${uiState.webhooks.size})") })
        }

        LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (tabIndex == 0) {
                items(uiState.apiKeys, key = { it.id }) { key ->
                    Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(key.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                AssistChip(onClick = {}, label = { Text(key.status.uppercase(), style = MaterialTheme.typography.labelSmall) })
                            }
                            Text(key.secretMasked, fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.bodySmall, color = tokens.accent)
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text("${key.provider} · ${key.rateLimitRpm} RPM", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Row {
                                    if (key.status == "active") {
                                        TextButton(onClick = { viewModel.revokeApiKey(key.id) }) { Text("Revoke") }
                                    }
                                    IconButton(onClick = { viewModel.deleteApiKey(key.id) }) {
                                        Icon(Icons.Default.DeleteOutline, contentDescription = "Delete key")
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                item {
                    OutlinedButton(onClick = { showDeliveries = true }, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Default.History, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Inspect Recent Delivery Logs (${uiState.webhookDeliveries.size})")
                    }
                }
                items(uiState.webhooks, key = { it.id }) { wh ->
                    Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                        Row(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(wh.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Text(wh.url, style = MaterialTheme.typography.bodySmall, color = tokens.accent)
                                Text("Events: ${wh.events.joinToString(", ")}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            IconButton(onClick = { viewModel.deleteWebhook(wh.id) }) {
                                Icon(Icons.Default.DeleteOutline, contentDescription = "Delete webhook")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PluginsScreen(
    uiState: StudioUiState,
    strings: AppStrings,
    viewModel: StudioViewModel,
    modifier: Modifier = Modifier
) {
    val tokens = LocalSupremeTokens.current
    var category by remember { mutableStateOf("all") }
    val categories = listOf("all", "developer", "ai-grounding", "productivity", "security")
    val filtered = remember(uiState.plugins, category) {
        if (category == "all") uiState.plugins else uiState.plugins.filter { it.category == category }
    }

    LazyColumn(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
        contentPadding = PaddingValues(vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Text(strings.pluginsTools, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                categories.forEach { cat ->
                    FilterChip(
                        selected = category == cat,
                        onClick = { category = cat },
                        label = { Text(cat.replaceFirstChar { it.uppercase() }) }
                    )
                }
            }
        }

        items(filtered, key = { it.id }) { plugin ->
            Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(Icons.Default.Extension, contentDescription = null, tint = tokens.accent)
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Text("${plugin.name} v${plugin.version}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        Text(plugin.tagline, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(checked = plugin.isEnabled, onCheckedChange = { viewModel.togglePlugin(plugin.id) })
                }
            }
        }
    }
}
