package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.data.SeedCatalog
import com.example.i18n.AppStrings
import com.example.model.KnowledgeDoc
import com.example.ui.theme.LocalSupremeTokens
import com.example.viewmodel.StudioUiState
import com.example.viewmodel.StudioViewModel

@Composable
fun PlanUsageScreen(
    uiState: StudioUiState,
    strings: AppStrings,
    viewModel: StudioViewModel,
    modifier: Modifier = Modifier
) {
    val tokens = LocalSupremeTokens.current
    val used = uiState.settings.monthlyTokensUsed
    val limit = uiState.settings.monthlyTokensLimit.coerceAtLeast(1L)
    val ratio = (used.toFloat() / limit.toFloat()).coerceIn(0f, 1f)
    val planSpec = SeedCatalog.PLANS[uiState.settings.plan] ?: SeedCatalog.PLANS.values.first()

    LazyColumn(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
        contentPadding = PaddingValues(vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text(strings.planUsage, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        }

        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = tokens.glassSurface),
                border = BorderStroke(1.dp, tokens.glassBorder)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("${planSpec.id.name} Plan", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text("${planSpec.contextWindowLabel} context · ${planSpec.rateLimitRpm} RPM", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        AssistChip(onClick = {}, label = { Text("$${planSpec.monthlyPriceUsd}/mo") })
                    }
                    LinearProgressIndicator(
                        progress = { ratio },
                        modifier = Modifier.fillMaxWidth().height(8.dp)
                    )
                    Text(
                        "${used / 1000}k / ${limit / 1000}k tokens (${(ratio * 100).toInt()}% ${strings.usedSuffix})",
                        style = MaterialTheme.typography.labelMedium
                    )
                }
            }
        }

        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = tokens.glassSurface),
                border = BorderStroke(1.dp, tokens.glassBorder)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Model Token Distribution", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Canvas(modifier = Modifier.fillMaxWidth().height(26.dp)) {
                        var startX = 0f
                        SeedCatalog.MODEL_USAGE_BREAKDOWN.forEach { slice ->
                            val segW = size.width * (slice.percentage / 100f)
                            drawRoundRect(
                                color = Color(slice.colorHex),
                                topLeft = Offset(startX, 0f),
                                size = Size((segW - 4f).coerceAtLeast(2f), size.height),
                                cornerRadius = CornerRadius(6f, 6f)
                            )
                            startX += segW
                        }
                    }
                    SeedCatalog.MODEL_USAGE_BREAKDOWN.forEach { slice ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Surface(modifier = Modifier.size(10.dp), shape = CircleShape, color = Color(slice.colorHex)) {}
                                Text(slice.model, style = MaterialTheme.typography.bodySmall)
                            }
                            Text("${slice.tokens / 1000}k · ${slice.cost}", style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
            }
        }

        item {
            Text("Pay-As-You-Go Top-Up Packs", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        }

        items(SeedCatalog.TOPUP_PACKAGES, key = { it.id }) { pkg ->
            Card(
                colors = CardDefaults.cardColors(containerColor = tokens.glassSurface),
                border = BorderStroke(1.dp, tokens.glassBorder)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("+${pkg.tokensBonus / 1000}k Tokens", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            pkg.badge?.let { AssistChip(onClick = {}, label = { Text(it, style = MaterialTheme.typography.labelSmall) }) }
                        }
                        Text("$${pkg.amountUsd} one-time credit bundle", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Button(
                        onClick = { viewModel.topUpTokens(pkg) },
                        modifier = Modifier.testTag("topup_${pkg.id}_btn")
                    ) {
                        Text("Add $${pkg.amountUsd}")
                    }
                }
            }
        }

        item {
            Text("Recent Invoices", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        }

        items(uiState.invoices, key = { it.id }) { inv ->
            Card(
                colors = CardDefaults.cardColors(containerColor = tokens.glassSurface),
                border = BorderStroke(1.dp, tokens.glassBorder)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("${inv.invoiceNumber} · ${inv.planName}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Text(inv.date, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Text("$${"%.2f".format(inv.amountUsd)} (${inv.status.uppercase()})", style = MaterialTheme.typography.labelMedium, color = tokens.success)
                }
            }
        }
    }
}

@Composable
fun KnowledgeBaseScreen(
    uiState: StudioUiState,
    strings: AppStrings,
    viewModel: StudioViewModel,
    modifier: Modifier = Modifier
) {
    val tokens = LocalSupremeTokens.current
    var showAddDialog by remember { mutableStateOf(false) }
    var previewDoc by remember { mutableStateOf<KnowledgeDoc?>(null) }
    var docTitle by remember { mutableStateOf("") }
    var docType by remember { mutableStateOf("markdown") }
    var docContent by remember { mutableStateOf("") }

    if (showAddDialog) {
        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("Index Knowledge Document") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(value = docTitle, onValueChange = { docTitle = it }, label = { Text("Document Title") }, singleLine = true)
                    OutlinedTextField(value = docType, onValueChange = { docType = it }, label = { Text("Type (markdown, pdf, code, url)") }, singleLine = true)
                    OutlinedTextField(value = docContent, onValueChange = { docContent = it }, label = { Text("Content / Excerpt") }, minLines = 4, maxLines = 6)
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (docTitle.isNotBlank() && docContent.isNotBlank()) {
                        viewModel.addKnowledgeDoc(docTitle, docType.ifBlank { "markdown" }, docContent)
                        docTitle = ""; docContent = ""
                        showAddDialog = false
                    }
                }) { Text("Index") }
            },
            dismissButton = { TextButton(onClick = { showAddDialog = false }) { Text("Cancel") } }
        )
    }

    previewDoc?.let { doc ->
        AlertDialog(
            onDismissRequest = { previewDoc = null },
            title = { Text(doc.title) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("${doc.tokenCount} tokens · ${doc.chunkCount} chunks · ${doc.status}", style = MaterialTheme.typography.labelSmall, color = tokens.accent)
                    Text(doc.contentPreview, style = MaterialTheme.typography.bodySmall)
                }
            },
            confirmButton = { TextButton(onClick = { previewDoc = null }) { Text(strings.close) } }
        )
    }

    LazyColumn(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
        contentPadding = PaddingValues(vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(strings.knowledgeBase, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text("Toggle Grounding to inject active chunks into chat prompts.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                FilledTonalButton(onClick = { showAddDialog = true }, modifier = Modifier.testTag("kb_add_doc_btn")) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Add")
                }
            }
        }

        item {
            Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Global RAG Context Grounding", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Text(if (uiState.isGuest) "Sign in to enable live RAG grounding." else "Auto-matches relevant docs on every prompt.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(
                        checked = uiState.settings.enableKnowledgeGrounding,
                        onCheckedChange = { enabled -> viewModel.updateSettings { it.copy(enableKnowledgeGrounding = enabled) } }
                    )
                }
            }
        }

        items(uiState.knowledgeDocs, key = { it.id }) { doc ->
            Card(
                onClick = { previewDoc = doc },
                colors = CardDefaults.cardColors(containerColor = tokens.glassSurface),
                border = BorderStroke(1.dp, tokens.glassBorder)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(Icons.Default.Description, contentDescription = null, tint = tokens.accent)
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(doc.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("${doc.type.uppercase()} · ${doc.tokenCount} tokens · ${doc.lastIndexed}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(checked = doc.isGroundingActive, onCheckedChange = { viewModel.toggleKnowledgeGrounding(doc.id) })
                    IconButton(onClick = { viewModel.deleteKnowledgeDoc(doc.id) }) {
                        Icon(Icons.Default.DeleteOutline, contentDescription = "Delete document")
                    }
                }
            }
        }
    }
}

@Composable
fun TeamScreen(
    uiState: StudioUiState,
    strings: AppStrings,
    viewModel: StudioViewModel,
    modifier: Modifier = Modifier
) {
    val tokens = LocalSupremeTokens.current
    var showInvite by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("Developer") }

    if (showInvite) {
        AlertDialog(
            onDismissRequest = { showInvite = false },
            title = { Text("Invite Team Member") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Full Name") }, singleLine = true)
                    OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Work Email") }, singleLine = true)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("Developer", "Reviewer", "Viewer").forEach { r ->
                            FilterChip(selected = role == r, onClick = { role = r }, label = { Text(r) })
                        }
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (name.isNotBlank() && email.isNotBlank()) {
                        viewModel.inviteTeamMember(name, email, role)
                        name = ""; email = ""; showInvite = false
                    }
                }) { Text("Send Invite") }
            },
            dismissButton = { TextButton(onClick = { showInvite = false }) { Text("Cancel") } }
        )
    }

    LazyColumn(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
        contentPadding = PaddingValues(vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(strings.teamMembers, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                FilledTonalButton(onClick = { showInvite = true }, modifier = Modifier.testTag("team_invite_btn")) {
                    Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Invite")
                }
            }
        }

        items(uiState.teamMembers, key = { it.id }) { member ->
            Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Surface(modifier = Modifier.size(40.dp), shape = CircleShape, color = tokens.accent.copy(alpha = 0.22f)) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(member.avatar, fontWeight = FontWeight.Bold, color = tokens.accent)
                        }
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(member.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Text("${member.email} · ${member.role}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    if (member.role != "Owner") {
                        IconButton(onClick = { viewModel.removeTeamMember(member.id) }) {
                            Icon(Icons.Default.PersonRemove, contentDescription = "Remove member")
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ProjectsScreen(
    uiState: StudioUiState,
    strings: AppStrings,
    viewModel: StudioViewModel,
    onOpenChatWithPrompt: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val tokens = LocalSupremeTokens.current
    var showAdd by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var repoUrl by remember { mutableStateOf("") }
    var branch by remember { mutableStateOf("main") }
    var desc by remember { mutableStateOf("") }
    var lang by remember { mutableStateOf("Kotlin / Compose") }

    if (showAdd) {
        AlertDialog(
            onDismissRequest = { showAdd = false },
            title = { Text("Connect Git Repository") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Project Name") }, singleLine = true)
                    OutlinedTextField(value = repoUrl, onValueChange = { repoUrl = it }, label = { Text("GitHub URL") }, singleLine = true)
                    OutlinedTextField(value = branch, onValueChange = { branch = it }, label = { Text("Branch") }, singleLine = true)
                    OutlinedTextField(value = lang, onValueChange = { lang = it }, label = { Text("Primary Stack") }, singleLine = true)
                    OutlinedTextField(value = desc, onValueChange = { desc = it }, label = { Text("Description") }, maxLines = 2)
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (name.isNotBlank() && repoUrl.isNotBlank()) {
                        viewModel.addProject(name, repoUrl, branch.ifBlank { "main" }, desc, lang)
                        name = ""; repoUrl = ""; desc = ""; showAdd = false
                    }
                }) { Text("Connect") }
            },
            dismissButton = { TextButton(onClick = { showAdd = false }) { Text("Cancel") } }
        )
    }

    LazyColumn(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
        contentPadding = PaddingValues(vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(strings.myProjects, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                FilledTonalButton(onClick = { showAdd = true }, modifier = Modifier.testTag("projects_add_btn")) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Connect Repo")
                }
            }
        }

        items(uiState.projects, key = { it.id }) { proj ->
            Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(proj.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text("${proj.language} · branch: ${proj.branch}", style = MaterialTheme.typography.labelSmall, color = tokens.accent)
                        }
                        IconButton(onClick = { viewModel.deleteProject(proj.id) }) {
                            Icon(Icons.Default.DeleteOutline, contentDescription = "Disconnect project")
                        }
                    }
                    Text(proj.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilledTonalButton(onClick = {
                            onOpenChatWithPrompt("Analyze repository ${proj.repoUrl} (branch: ${proj.branch}) and suggest architecture improvements.")
                        }) {
                            Icon(Icons.Default.Chat, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Chat with Repo")
                        }
                        OutlinedButton(onClick = {
                            onOpenChatWithPrompt("Run a strict OWASP security and code quality review plan for ${proj.name} (${proj.repoUrl}).")
                        }) {
                            Text("Code Review")
                        }
                    }
                }
            }
        }
    }
}
