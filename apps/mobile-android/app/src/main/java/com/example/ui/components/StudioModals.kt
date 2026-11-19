package com.example.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.data.SeedCatalog
import com.example.i18n.AppStrings
import com.example.model.PlanTier
import com.example.model.PromptTemplateItem
import com.example.model.RolePersona
import com.example.ui.theme.LocalSupremeTokens

@Composable
fun PromptLibraryDialog(
    templates: List<PromptTemplateItem>,
    strings: AppStrings,
    onUseTemplate: (PromptTemplateItem) -> Unit,
    onCreateTemplate: (title: String, category: String, desc: String, template: String) -> Unit,
    onDismiss: () -> Unit
) {
    val tokens = LocalSupremeTokens.current
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("all") }
    var showCreateForm by remember { mutableStateOf(false) }

    var newTitle by remember { mutableStateOf("") }
    var newCategory by remember { mutableStateOf("general") }
    var newDesc by remember { mutableStateOf("") }
    var newBody by remember { mutableStateOf("") }

    val categories = listOf("all", "research", "writing", "general", "code", "architecture", "security", "review")
    val filtered = remember(templates, searchQuery, selectedCategory) {
        templates.filter { item ->
            val catOk = selectedCategory == "all" || item.category.equals(selectedCategory, ignoreCase = true)
            val q = searchQuery.trim().lowercase()
            val qOk = q.isEmpty() || item.title.lowercase().contains(q) || item.description.lowercase().contains(q)
            catOk && qOk
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.94f)
                .fillMaxHeight(0.84f)
                .widthIn(max = 620.dp),
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, tokens.glassBorder)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = tokens.accent)
                        Text("Prompt Library", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        TextButton(
                            onClick = { showCreateForm = !showCreateForm },
                            modifier = Modifier.testTag("prompt_library_new_btn")
                        ) {
                            Icon(if (showCreateForm) Icons.Default.List else Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(if (showCreateForm) "Browse" else "New Recipe")
                        }
                        IconButton(onClick = onDismiss, modifier = Modifier.testTag("prompt_library_close_btn")) {
                            Icon(Icons.Default.Close, contentDescription = strings.close)
                        }
                    }
                }

                Spacer(Modifier.height(10.dp))

                if (showCreateForm) {
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedTextField(
                            value = newTitle,
                            onValueChange = { newTitle = it },
                            label = { Text("Recipe Title") },
                            modifier = Modifier.fillMaxWidth().testTag("new_prompt_title_input"),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = newCategory,
                            onValueChange = { newCategory = it },
                            label = { Text("Category (code, general, research, security)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = newDesc,
                            onValueChange = { newDesc = it },
                            label = { Text("Short Description") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = newBody,
                            onValueChange = { newBody = it },
                            label = { Text("Prompt Template") },
                            modifier = Modifier.fillMaxWidth().heightIn(min = 130.dp),
                            maxLines = 6
                        )
                        Button(
                            onClick = {
                                if (newTitle.isNotBlank() && newBody.isNotBlank()) {
                                    onCreateTemplate(newTitle, newCategory.ifBlank { "general" }, newDesc, newBody)
                                    newTitle = ""; newDesc = ""; newBody = ""
                                    showCreateForm = false
                                }
                            },
                            modifier = Modifier.fillMaxWidth().testTag("save_prompt_recipe_btn")
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Text("Save Recipe")
                        }
                    }
                } else {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = { Text("Search recipes...") },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().testTag("prompt_library_search")
                    )
                    Spacer(Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        categories.forEach { cat ->
                            FilterChip(
                                selected = selectedCategory == cat,
                                onClick = { selectedCategory = cat },
                                label = { Text(cat.replaceFirstChar { it.uppercase() }) }
                            )
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(filtered, key = { it.id }) { item ->
                            Card(
                                onClick = { onUseTemplate(item) },
                                modifier = Modifier.fillMaxWidth().testTag("prompt_item_${item.id}"),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f)),
                                border = BorderStroke(1.dp, tokens.glassBorder)
                            ) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(item.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                                        AssistChip(onClick = { onUseTemplate(item) }, label = { Text("Use", style = MaterialTheme.typography.labelSmall) })
                                    }
                                    Text(item.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
fun RoleLabDialog(
    activeRole: RolePersona,
    customInstruction: String,
    onSelectRole: (RolePersona, String) -> Unit,
    onDismiss: () -> Unit
) {
    val tokens = LocalSupremeTokens.current
    var selected by remember { mutableStateOf(activeRole) }
    var instructionText by remember { mutableStateOf(customInstruction) }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.94f)
                .fillMaxHeight(0.84f)
                .widthIn(max = 600.dp),
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, tokens.glassBorder)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Icon(Icons.Default.Psychology, contentDescription = null, tint = tokens.accent)
                        Text("Active Role Persona", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }
                    IconButton(onClick = onDismiss, modifier = Modifier.testTag("role_modal_close_btn")) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                }
                Spacer(Modifier.height(10.dp))

                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(SeedCatalog.ROLES, key = { it.id }) { role ->
                        val isSelected = role.id == selected.id
                        Card(
                            onClick = { selected = role },
                            modifier = Modifier.fillMaxWidth().testTag("role_option_${role.id}"),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected) tokens.accent.copy(alpha = 0.14f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)
                            ),
                            border = BorderStroke(1.dp, if (isSelected) tokens.accent else tokens.glassBorder)
                        ) {
                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text(role.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                                    Surface(shape = RoundedCornerShape(6.dp), color = tokens.accent.copy(alpha = 0.2f)) {
                                        Text(role.badge, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                    }
                                }
                                Text(role.tagline, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }

                    item {
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(
                            value = instructionText,
                            onValueChange = { instructionText = it },
                            label = { Text("Custom System Instructions (Optional)") },
                            placeholder = { Text("e.g., Answer concisely with Kotlin Multiplatform examples...") },
                            modifier = Modifier.fillMaxWidth().heightIn(min = 96.dp).testTag("custom_instruction_input"),
                            maxLines = 4
                        )
                    }
                }

                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = {
                        onSelectRole(selected, instructionText)
                        onDismiss()
                    },
                    modifier = Modifier.fillMaxWidth().testTag("apply_role_btn")
                ) {
                    Text("Activate ${selected.name}")
                }
            }
        }
    }
}

@Composable
fun AuthModalDialog(
    reason: String?,
    isLoading: Boolean,
    error: String?,
    strings: AppStrings,
    onLogin: (email: String, password: String) -> Unit,
    onSignup: (name: String, email: String, password: String, plan: PlanTier) -> Unit,
    onDismiss: () -> Unit
) {
    val tokens = LocalSupremeTokens.current
    var isSignupTab by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var selectedPlan by remember { mutableStateOf(PlanTier.FREE) }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .widthIn(max = 460.dp),
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, tokens.glassBorder)
        ) {
            Column(
                modifier = Modifier
                    .padding(22.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(strings.appName, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    IconButton(onClick = onDismiss, modifier = Modifier.testTag("auth_close_btn")) {
                        Icon(Icons.Default.Close, contentDescription = strings.close)
                    }
                }

                if (!reason.isNullOrBlank()) {
                    Surface(
                        color = tokens.accent.copy(alpha = 0.14f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(reason, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(10.dp))
                    }
                }

                TabRow(selectedTabIndex = if (isSignupTab) 1 else 0) {
                    Tab(
                        selected = !isSignupTab,
                        onClick = { isSignupTab = false },
                        text = { Text(strings.authSignInTab) },
                        modifier = Modifier.testTag("auth_tab_signin")
                    )
                    Tab(
                        selected = isSignupTab,
                        onClick = { isSignupTab = true },
                        text = { Text(strings.authCreateAccountTab) },
                        modifier = Modifier.testTag("auth_tab_signup")
                    )
                }

                if (isSignupTab) {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Full Name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().testTag("auth_name_input")
                    )
                }

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email Address") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().testTag("auth_email_input")
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().testTag("auth_password_input")
                )

                if (isSignupTab) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PlanTier.entries.forEach { tier ->
                            FilterChip(
                                selected = selectedPlan == tier,
                                onClick = { selectedPlan = tier },
                                label = { Text(tier.name) }
                            )
                        }
                    }
                }

                if (!error.isNullOrBlank()) {
                    Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }

                Button(
                    onClick = {
                        if (isSignupTab) onSignup(name, email, password, selectedPlan)
                        else onLogin(email, password)
                    },
                    enabled = !isLoading && email.isNotBlank() && password.isNotBlank() && (!isSignupTab || name.isNotBlank()),
                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).testTag("auth_submit_btn")
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(8.dp))
                    }
                    Text(if (isSignupTab) strings.authCreateAccountTab else strings.authSignInTab)
                }

                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).testTag("auth_continue_guest_btn")
                ) {
                    Text(strings.authContinueGuestBtn)
                }
            }
        }
    }
}

@Composable
fun AdminTwoFactorDialog(
    onVerify: (code: String, trust7Days: Boolean) -> Boolean,
    onDismiss: () -> Unit
) {
    var code by remember { mutableStateOf("") }
    var trust7Days by remember { mutableStateOf(true) }
    var invalidError by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Default.Shield, contentDescription = null) },
        title = { Text("Admin Studio 2FA Verification") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "Enter a 6-digit authenticator verification code to unlock Admin Studio controls.",
                    style = MaterialTheme.typography.bodySmall
                )
                OutlinedTextField(
                    value = code,
                    onValueChange = { if (it.length <= 6 && it.all(Char::isDigit)) { code = it; invalidError = false } },
                    label = { Text("6-Digit TOTP Code") },
                    singleLine = true,
                    isError = invalidError,
                    supportingText = if (invalidError) { { Text("Enter 6 numeric digits") } } else null,
                    modifier = Modifier.fillMaxWidth().testTag("admin_2fa_input")
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { trust7Days = !trust7Days }
                ) {
                    Checkbox(checked = trust7Days, onCheckedChange = { trust7Days = it })
                    Text("Trust this device for 7 days", style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (!onVerify(code, trust7Days)) {
                        invalidError = true
                    }
                },
                modifier = Modifier.testTag("admin_2fa_verify_btn")
            ) {
                Text("Verify & Unlock")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, modifier = Modifier.testTag("admin_2fa_cancel_btn")) {
                Text("Cancel")
            }
        }
    )
}
