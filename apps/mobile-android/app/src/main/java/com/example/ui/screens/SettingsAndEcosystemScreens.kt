package com.example.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.SeedCatalog
import com.example.i18n.AppStrings
import com.example.model.*
import com.example.ui.theme.LocalSupremeTokens
import com.example.ui.theme.themeAccentPair
import com.example.ui.theme.themeDisplayLabel
import com.example.viewmodel.StudioUiState
import com.example.viewmodel.StudioViewModel

@Composable
fun SettingsScreen(
    uiState: StudioUiState,
    strings: AppStrings,
    viewModel: StudioViewModel,
    modifier: Modifier = Modifier
) {
    val tokens = LocalSupremeTokens.current
    val settings = uiState.settings
    var tabIndex by remember { mutableIntStateOf(0) }
    var customInstr by remember(uiState.customInstruction) { mutableStateOf(uiState.customInstruction) }

    Column(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(strings.settingsTitle, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)

        ScrollableTabRow(selectedTabIndex = tabIndex, edgePadding = 0.dp) {
            listOf(strings.tabGeneral, strings.tabAppearance, strings.tabVoiceAvatar, strings.tabAccount).forEachIndexed { idx, label ->
                Tab(selected = tabIndex == idx, onClick = { tabIndex = idx }, text = { Text(label) })
            }
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            when (tabIndex) {
                0 -> {
                    item {
                        Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text(strings.languageCardTitle, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Text(strings.languageCardSubtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    FilterChip(
                                        selected = settings.language == AppLanguage.EN,
                                        onClick = { viewModel.updateSettings { it.copy(language = AppLanguage.EN) } },
                                        label = { Text("English (EN)") },
                                        modifier = Modifier.testTag("settings_lang_en")
                                    )
                                    FilterChip(
                                        selected = settings.language == AppLanguage.BN,
                                        onClick = { viewModel.updateSettings { it.copy(language = AppLanguage.BN) } },
                                        label = { Text("বাংলা (BN)") },
                                        modifier = Modifier.testTag("settings_lang_bn")
                                    )
                                }
                            }
                        }
                    }
                    item {
                        Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(strings.autoModelTitle, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                        Text(strings.autoModelDesc, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Switch(checked = settings.autoModelRouting, onCheckedChange = { viewModel.setAutoModelRouting(it) })
                                }
                                HorizontalDivider(color = tokens.glassBorder)
                                OutlinedTextField(
                                    value = customInstr,
                                    onValueChange = { customInstr = it },
                                    label = { Text("Default System Instructions") },
                                    minLines = 3,
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Button(onClick = { viewModel.setCustomInstruction(customInstr) }) {
                                    Text(strings.savePreferences)
                                }
                            }
                        }
                    }
                }
                1 -> {
                    item {
                        Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text("Color Mode", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    ThemeMode.entries.forEach { mode ->
                                        FilterChip(
                                            selected = settings.themeMode == mode,
                                            onClick = { viewModel.updateSettings { it.copy(themeMode = mode) } },
                                            label = { Text(mode.name.lowercase().replaceFirstChar { it.uppercase() }) }
                                        )
                                    }
                                }
                                Text("Motion Speed", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    MotionSpeed.entries.forEach { spd ->
                                        FilterChip(
                                            selected = settings.motionSpeed == spd,
                                            onClick = { viewModel.updateSettings { it.copy(motionSpeed = spd) } },
                                            label = { Text(spd.name.lowercase().replaceFirstChar { it.uppercase() }) }
                                        )
                                    }
                                }
                                Text("Backdrop Scrim Contrast", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    ScrimIntensity.entries.forEach { scrim ->
                                        FilterChip(
                                            selected = settings.scrimIntensity == scrim,
                                            onClick = { viewModel.updateSettings { it.copy(scrimIntensity = scrim) } },
                                            label = { Text(scrim.name.lowercase().replaceFirstChar { it.uppercase() }) }
                                        )
                                    }
                                }
                            }
                        }
                    }
                    item {
                        Text("11 Live Screen Backdrops", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    }
                    items(LiveThemeId.entries, key = { it.name }) { themeId ->
                        val (primary, secondary) = themeAccentPair(themeId)
                        val selected = settings.liveThemeId == themeId
                        Card(
                            onClick = { viewModel.updateSettings { it.copy(liveThemeId = themeId) } },
                            colors = CardDefaults.cardColors(containerColor = tokens.glassSurface),
                            border = BorderStroke(1.5.dp, if (selected) primary else tokens.glassBorder),
                            modifier = Modifier.fillMaxWidth().testTag("theme_pick_${themeId.name.lowercase()}")
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(38.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(Brush.linearGradient(listOf(primary, secondary)))
                                )
                                Text(themeDisplayLabel(themeId), style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                                if (selected) Icon(Icons.Default.CheckCircle, contentDescription = "Active", tint = primary)
                            }
                        }
                    }
                }
                2 -> {
                    item {
                        Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Image(
                                        painter = painterResource(id = R.drawable.avatar_hologram_male),
                                        contentDescription = "Voice Avatar Preview",
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.size(56.dp).clip(CircleShape)
                                    )
                                    Column {
                                        Text("Voice Companion & Avatar", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                        Text("Local-first Android TTS + SpeechRecognizer (EN / বাংলা)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    AvatarPreset.entries.forEach { preset ->
                                        FilterChip(
                                            selected = settings.avatarPreset == preset,
                                            onClick = { viewModel.updateSettings { it.copy(avatarPreset = preset) } },
                                            label = { Text(preset.name.replace("_", " ")) }
                                        )
                                    }
                                }
                                Text("${strings.voicePitchLabel}: ${"%.2f".format(settings.voicePitch)}x", style = MaterialTheme.typography.labelMedium)
                                Slider(value = settings.voicePitch, onValueChange = { viewModel.updateVoicePitch(it) }, valueRange = 0.7f..1.4f)
                                Text("${strings.micSensitivity}: ${(settings.micSensitivity * 100).toInt()}%", style = MaterialTheme.typography.labelMedium)
                                Slider(value = settings.micSensitivity, onValueChange = { viewModel.updateMicSensitivity(it) }, valueRange = 0.5f..1.8f)
                                OutlinedButton(onClick = {
                                    val sample = if (settings.language == AppLanguage.BN) "সুপ্রিম এআই স্টুডিও ভয়েস সিস্টেম প্রস্তুত।" else "SupremeAI Studio voice companion is ready."
                                    viewModel.speakText(sample)
                                }) {
                                    Icon(Icons.Default.VolumeUp, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Test Voice Output")
                                }
                            }
                        }
                    }
                }
                else -> {
                    item {
                        Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text(if (uiState.isGuest) strings.guestPreview else (uiState.authUser?.name ?: settings.name), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Text(uiState.authUser?.email?.ifBlank { "Anonymous Guest Session" } ?: "Anonymous Guest Session", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                if (uiState.isGuest) {
                                    Button(onClick = { viewModel.openAuthModal() }, modifier = Modifier.testTag("settings_signin_btn")) {
                                        Text(strings.signInSignUp)
                                    }
                                } else {
                                    OutlinedButton(onClick = { viewModel.logout() }, modifier = Modifier.testTag("settings_logout_btn")) {
                                        Text("Sign Out")
                                    }
                                }
                            }
                        }
                    }
                    if (!uiState.isGuest) {
                        item {
                            Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(strings.developerMode, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                            Text("Exposes Projects, API Keys, Plugins, and Workspace Dock tools.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                        Switch(
                                            checked = uiState.effectiveDeveloperMode,
                                            enabled = uiState.isDeveloperEligible,
                                            onCheckedChange = { viewModel.toggleDeveloperMode() }
                                        )
                                    }
                                    if (uiState.isAdminEligible) {
                                        HorizontalDivider(color = tokens.glassBorder)
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(strings.adminStudio, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                                Text("Requires 6-digit 2FA verification to access cluster & governance.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                            Switch(
                                                checked = uiState.effectiveAdminMode,
                                                onCheckedChange = { viewModel.toggleAdminRole() }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ModelMatrixScreen(
    uiState: StudioUiState,
    strings: AppStrings,
    viewModel: StudioViewModel,
    onBackToChat: () -> Unit,
    modifier: Modifier = Modifier
) {
    val tokens = LocalSupremeTokens.current
    LazyColumn(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
        contentPadding = PaddingValues(vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(strings.modelMatrixTitle, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Inspect foundation model routing latency, context windows, and reasoning tiers.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        items(SeedCatalog.MODELS, key = { it.id }) { model ->
            val isActive = uiState.activeModel.id == model.id && !uiState.settings.autoModelRouting
            val accent = Color(model.accentColorHex)
            Card(
                colors = CardDefaults.cardColors(containerColor = tokens.glassSurface),
                border = BorderStroke(1.dp, if (isActive) accent else tokens.glassBorder)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Surface(modifier = Modifier.size(10.dp), shape = CircleShape, color = accent) {}
                            Text(model.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        }
                        AssistChip(onClick = {}, label = { Text(model.badge, style = MaterialTheme.typography.labelSmall) })
                    }
                    Text(model.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Latency: ${model.latencyRating} · Context: ${model.contextTokens} · Reasoning: ${model.reasoningCapability}", style = MaterialTheme.typography.labelSmall, color = accent)
                    Button(
                        onClick = {
                            viewModel.selectModel(model)
                            onBackToChat()
                        },
                        modifier = Modifier.align(Alignment.End)
                    ) {
                        Text(if (isActive) "Active Model" else "Use in Chat")
                    }
                }
            }
        }
    }
}

@Composable
fun RoleLabScreen(
    uiState: StudioUiState,
    strings: AppStrings,
    viewModel: StudioViewModel,
    onBackToChat: () -> Unit,
    modifier: Modifier = Modifier
) {
    val tokens = LocalSupremeTokens.current
    LazyColumn(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
        contentPadding = PaddingValues(vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(strings.rolesLabTitle, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Switch specialized system personas tuned for engineering, security, or rapid synthesis.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        items(SeedCatalog.ROLES, key = { it.id }) { role ->
            val isActive = uiState.activeRole.id == role.id
            Card(
                colors = CardDefaults.cardColors(containerColor = tokens.glassSurface),
                border = BorderStroke(1.dp, if (isActive) tokens.accent else tokens.glassBorder)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(role.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        AssistChip(onClick = {}, label = { Text(role.badge) })
                    }
                    Text(role.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Button(
                        onClick = {
                            viewModel.selectRole(role)
                            onBackToChat()
                        },
                        modifier = Modifier.align(Alignment.End)
                    ) {
                        Text(if (isActive) "Active Persona" else "Activate Persona")
                    }
                }
            }
        }
    }
}

@Composable
fun RepoHubScreen(
    strings: AppStrings,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val tokens = LocalSupremeTokens.current
    LazyColumn(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
        contentPadding = PaddingValues(vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(strings.reposHubTitle, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Core SupremeAI repositories powering the gateway, studio client, and MCP tower.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        items(SeedCatalog.ECOSYSTEM_REPOS, key = { it.name }) { repo ->
            Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(repo.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        AssistChip(onClick = {}, label = { Text(repo.status, style = MaterialTheme.typography.labelSmall) })
                    }
                    Text(repo.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(repo.stack, style = MaterialTheme.typography.labelSmall, color = tokens.accent)
                        TextButton(onClick = {
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(repo.url)))
                        }) {
                            Text("Open GitHub")
                        }
                    }
                }
            }
        }
    }
}
