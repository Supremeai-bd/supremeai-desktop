package com.example.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination.Companion.hasRoute
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.R
import com.example.i18n.AppStrings
import com.example.i18n.stringsFor
import com.example.model.AppLanguage
import com.example.model.ChatSession
import com.example.ui.components.*
import com.example.ui.screens.*
import com.example.ui.theme.LiveScreenBackdrop
import com.example.ui.theme.LocalSupremeTokens
import com.example.ui.theme.SupremeTheme
import com.example.viewmodel.StudioUiState
import com.example.viewmodel.StudioViewModel
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable

@Serializable object ChatRoute
@Serializable object HistoryRoute
@Serializable object PlanUsageRoute
@Serializable object KnowledgeRoute
@Serializable object TeamRoute
@Serializable object ProjectsRoute
@Serializable object ApiKeysRoute
@Serializable object PluginsRoute
@Serializable object SettingsRoute
@Serializable object ModelsRoute
@Serializable object RolesRoute
@Serializable object ReposRoute
@Serializable object AdminOverviewRoute
@Serializable object AdminMcpRoute
@Serializable object AdminOpsRoute
@Serializable object AdminGovRoute

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SupremeStudioApp(
    viewModel: StudioViewModel,
    widthSizeClass: WindowWidthSizeClass
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val voiceStatus by viewModel.voiceStatus.collectAsStateWithLifecycle()
    val voiceInputLevel by viewModel.voiceInputLevel.collectAsStateWithLifecycle()
    val voiceOutputLevel by viewModel.voiceOutputLevel.collectAsStateWithLifecycle()
    val voiceTranscript by viewModel.voiceTranscript.collectAsStateWithLifecycle()

    val strings = remember(uiState.settings.language) { stringsFor(uiState.settings.language) }
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    val isExpanded = widthSizeClass == WindowWidthSizeClass.Expanded

    LaunchedEffect(uiState.toastMessage) {
        val msg = uiState.toastMessage
        if (!msg.isNullOrBlank()) {
            snackbarHostState.showSnackbar(msg, duration = SnackbarDuration.Short)
            viewModel.clearToast()
        }
    }

    fun navigateTo(route: Any) {
        navController.navigate(route) {
            launchSingleTop = true
        }
        if (!isExpanded) {
            scope.launch { drawerState.close() }
        }
    }

    SupremeTheme(settings = uiState.settings) {
        val tokens = LocalSupremeTokens.current

        val drawerContent: @Composable () -> Unit = {
            StudioSidebarContent(
                uiState = uiState,
                strings = strings,
                onNewChat = {
                    viewModel.createNewSession()
                    navigateTo(ChatRoute)
                },
                onSelectSession = { sid ->
                    viewModel.selectSession(sid)
                    navigateTo(ChatRoute)
                },
                onPinSession = { viewModel.togglePinSession(it) },
                onDeleteSession = { viewModel.deleteSession(it) },
                onNavigate = ::navigateTo,
                onOpenAuth = { viewModel.openAuthModal() },
                onToggleAdmin = { viewModel.toggleAdminRole() }
            )
        }

        val mainScaffold: @Composable () -> Unit = {
            Box(modifier = Modifier.fillMaxSize()) {
                LiveScreenBackdrop(
                    themeId = uiState.settings.liveThemeId,
                    motionSpeed = uiState.settings.motionSpeed,
                    scrimIntensity = uiState.settings.scrimIntensity,
                    isDark = tokens.isDark
                )

                Scaffold(
                    containerColor = Color.Transparent,
                    snackbarHost = { SnackbarHost(snackbarHostState) },
                    topBar = {
                        val isChat = backStackEntry?.destination?.hasRoute<ChatRoute>() != false
                        TopAppBar(
                            colors = TopAppBarDefaults.topAppBarColors(
                                containerColor = tokens.glassSurface.copy(alpha = 0.86f)
                            ),
                            navigationIcon = {
                                if (!isExpanded) {
                                    IconButton(
                                        onClick = { scope.launch { drawerState.open() } },
                                        modifier = Modifier.testTag("nav_drawer_open_btn")
                                    ) {
                                        Icon(Icons.Default.Menu, contentDescription = "Open navigation menu")
                                    }
                                }
                            },
                            title = {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Text(
                                        text = if (isChat) (uiState.activeSession?.title ?: strings.appName) else strings.appName,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            },
                            actions = {
                                TextButton(
                                    onClick = { viewModel.toggleLanguage() },
                                    modifier = Modifier.testTag("topbar_lang_toggle_btn")
                                ) {
                                    Text(
                                        if (uiState.settings.language == AppLanguage.BN) "বাং" else "EN",
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                IconButton(
                                    onClick = { viewModel.cycleThemeMode() },
                                    modifier = Modifier.testTag("topbar_theme_cycle_btn")
                                ) {
                                    Icon(
                                        if (tokens.isDark) Icons.Default.DarkMode else Icons.Default.LightMode,
                                        contentDescription = "Cycle light or dark mode"
                                    )
                                }
                                IconButton(
                                    onClick = { viewModel.setRoleModalOpen(true) },
                                    modifier = Modifier.testTag("topbar_role_btn")
                                ) {
                                    Icon(Icons.Default.Psychology, contentDescription = "Switch role persona")
                                }
                            }
                        )
                    }
                ) { innerPadding ->
                    NavHost(
                        navController = navController,
                        startDestination = ChatRoute,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                    ) {
                        composable<ChatRoute> {
                            ChatScreen(
                                uiState = uiState,
                                voiceStatus = voiceStatus,
                                voiceInputLevel = voiceInputLevel,
                                voiceOutputLevel = voiceOutputLevel,
                                voiceTranscript = voiceTranscript,
                                strings = strings,
                                viewModel = viewModel
                            )
                        }
                        composable<HistoryRoute> {
                            ChatHistoryScreen(
                                uiState = uiState,
                                strings = strings,
                                viewModel = viewModel,
                                onOpenChat = { navigateTo(ChatRoute) }
                            )
                        }
                        composable<PlanUsageRoute> {
                            PlanUsageScreen(uiState = uiState, strings = strings, viewModel = viewModel)
                        }
                        composable<KnowledgeRoute> {
                            KnowledgeBaseScreen(uiState = uiState, strings = strings, viewModel = viewModel)
                        }
                        composable<TeamRoute> {
                            TeamScreen(uiState = uiState, strings = strings, viewModel = viewModel)
                        }
                        composable<ProjectsRoute> {
                            ProjectsScreen(
                                uiState = uiState,
                                strings = strings,
                                viewModel = viewModel,
                                onOpenChatWithPrompt = { prompt ->
                                    navigateTo(ChatRoute)
                                    viewModel.sendMessage(prompt)
                                }
                            )
                        }
                        composable<ApiKeysRoute> {
                            ApiKeysScreen(uiState = uiState, strings = strings, viewModel = viewModel)
                        }
                        composable<PluginsRoute> {
                            PluginsScreen(uiState = uiState, strings = strings, viewModel = viewModel)
                        }
                        composable<SettingsRoute> {
                            SettingsScreen(uiState = uiState, strings = strings, viewModel = viewModel)
                        }
                        composable<ModelsRoute> {
                            ModelMatrixScreen(
                                uiState = uiState,
                                strings = strings,
                                viewModel = viewModel,
                                onBackToChat = { navigateTo(ChatRoute) }
                            )
                        }
                        composable<RolesRoute> {
                            RoleLabScreen(
                                uiState = uiState,
                                strings = strings,
                                viewModel = viewModel,
                                onBackToChat = { navigateTo(ChatRoute) }
                            )
                        }
                        composable<ReposRoute> {
                            RepoHubScreen(strings = strings)
                        }
                        composable<AdminOverviewRoute> {
                            AdminOverviewScreen(
                                uiState = uiState,
                                viewModel = viewModel,
                                onNavigateMcp = { navigateTo(AdminMcpRoute) },
                                onNavigateOps = { navigateTo(AdminOpsRoute) },
                                onNavigateGov = { navigateTo(AdminGovRoute) }
                            )
                        }
                        composable<AdminMcpRoute> {
                            AdminMcpTowerScreen(uiState = uiState, viewModel = viewModel)
                        }
                        composable<AdminOpsRoute> {
                            AdminOperationsScreen(uiState = uiState, viewModel = viewModel)
                        }
                        composable<AdminGovRoute> {
                            AdminGovernanceScreen(
                                uiState = uiState,
                                viewModel = viewModel,
                                onOpenChat = { navigateTo(ChatRoute) }
                            )
                        }
                    }
                }
            }
        }

        if (isExpanded) {
            PermanentNavigationDrawer(
                drawerContent = {
                    PermanentDrawerSheet(
                        modifier = Modifier.width(300.dp),
                        drawerContainerColor = MaterialTheme.colorScheme.surface
                    ) { drawerContent() }
                },
                content = mainScaffold
            )
        } else {
            ModalNavigationDrawer(
                drawerState = drawerState,
                drawerContent = {
                    ModalDrawerSheet(
                        modifier = Modifier.width(304.dp),
                        drawerContainerColor = MaterialTheme.colorScheme.surface
                    ) { drawerContent() }
                },
                content = mainScaffold
            )
        }

        // Modals & Dock Sheet
        if (uiState.workspaceDock.isOpen) {
            WorkspaceDockSheet(
                dockState = uiState.workspaceDock,
                schedules = uiState.schedules,
                strings = strings,
                onSelectTab = { viewModel.selectDockTab(it) },
                onNavigateBrowser = { viewModel.navigateBrowser(it) },
                onAddSchedule = { t, u, c, instr -> viewModel.addScheduledTask(t, u, c, instr) },
                onToggleSchedule = { viewModel.toggleSchedule(it) },
                onDeleteSchedule = { viewModel.deleteSchedule(it) },
                onRunTerminalCommand = { viewModel.appendTerminalLog(it) },
                onDismiss = { viewModel.closeWorkspaceDock() }
            )
        }

        if (uiState.showPromptLibraryModal) {
            PromptLibraryDialog(
                templates = uiState.promptTemplates,
                strings = strings,
                onUseTemplate = { tmpl ->
                    viewModel.insertPromptText(tmpl.template)
                    viewModel.setPromptLibraryOpen(false)
                    navigateTo(ChatRoute)
                },
                onCreateTemplate = { t, c, d, b -> viewModel.addCustomPrompt(t, c, d, b) },
                onDismiss = { viewModel.setPromptLibraryOpen(false) }
            )
        }

        if (uiState.showRoleModal) {
            RoleLabDialog(
                activeRole = uiState.activeRole,
                customInstruction = uiState.customInstruction,
                onSelectRole = { role, instr -> viewModel.selectRole(role, instr) },
                onDismiss = { viewModel.setRoleModalOpen(false) }
            )
        }

        if (uiState.showAuthModal) {
            AuthModalDialog(
                reason = uiState.authPromptReason,
                isLoading = uiState.isAuthLoading,
                error = uiState.authError,
                strings = strings,
                onLogin = { e, p -> viewModel.login(e, p) },
                onSignup = { n, e, p, tier -> viewModel.signup(n, e, p, tier) },
                onDismiss = { viewModel.closeAuthModal() }
            )
        }

        if (uiState.showTwoFactorModal) {
            AdminTwoFactorDialog(
                onVerify = { code, trust -> viewModel.verify2FA(code, trust) },
                onDismiss = { viewModel.dismissTwoFactorModal() }
            )
        }
    }
}

@Composable
private fun StudioSidebarContent(
    uiState: StudioUiState,
    strings: AppStrings,
    onNewChat: () -> Unit,
    onSelectSession: (String) -> Unit,
    onPinSession: (String) -> Unit,
    onDeleteSession: (String) -> Unit,
    onNavigate: (Any) -> Unit,
    onOpenAuth: () -> Unit,
    onToggleAdmin: () -> Unit
) {
    val tokens = LocalSupremeTokens.current
    val pinned = remember(uiState.sessions) { uiState.sessions.filter { it.isPinned } }
    val recent = remember(uiState.sessions) { uiState.sessions.filterNot { it.isPinned }.take(12) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Image(
                painter = painterResource(id = R.drawable.img_studio_mark),
                contentDescription = strings.appName,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(36.dp).clip(RoundedCornerShape(10.dp))
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(strings.appName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(
                    if (uiState.isGuest) strings.guestPreview else (uiState.authUser?.plan?.name ?: "FREE"),
                    style = MaterialTheme.typography.labelSmall,
                    color = tokens.accent
                )
            }
        }

        Spacer(Modifier.height(8.dp))

        Button(
            onClick = onNewChat,
            modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).testTag("sidebar_new_chat_btn")
        ) {
            Icon(Icons.Default.AddComment, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text(strings.newChat)
        }

        Spacer(Modifier.height(10.dp))

        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            if (pinned.isNotEmpty()) {
                item { SidebarHeader(strings.pinnedChats) }
                items(pinned, key = { "pin_${it.id}" }) { sess ->
                    SidebarSessionRow(sess, sess.id == uiState.activeSessionId, onSelectSession, onPinSession, onDeleteSession)
                }
            }

            item { SidebarHeader(strings.recentChats) }
            items(recent, key = { "rec_${it.id}" }) { sess ->
                SidebarSessionRow(sess, sess.id == uiState.activeSessionId, onSelectSession, onPinSession, onDeleteSession)
            }

            item { HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = tokens.glassBorder) }
            item { SidebarHeader(strings.workspaceSection) }

            item { SidebarNavItem(Icons.Default.History, strings.allConversations, "nav_history") { onNavigate(HistoryRoute) } }
            item { SidebarNavItem(Icons.Default.Memory, strings.modelMatrixTitle, "nav_models") { onNavigate(ModelsRoute) } }
            item { SidebarNavItem(Icons.Default.Psychology, strings.rolesLabTitle, "nav_roles") { onNavigate(RolesRoute) } }
            item { SidebarNavItem(Icons.Default.DataUsage, strings.planUsage, "nav_plan") { onNavigate(PlanUsageRoute) } }
            item { SidebarNavItem(Icons.Default.LibraryBooks, strings.knowledgeBase, "nav_kb") { onNavigate(KnowledgeRoute) } }
            item { SidebarNavItem(Icons.Default.Group, strings.teamMembers, "nav_team") { onNavigate(TeamRoute) } }
            item { SidebarNavItem(Icons.Default.Code, strings.reposHubTitle, "nav_repos") { onNavigate(ReposRoute) } }

            if (uiState.effectiveDeveloperMode || !uiState.isGuest) {
                item { SidebarHeader(strings.developerTools) }
                item { SidebarNavItem(Icons.Default.FolderSpecial, strings.myProjects, "nav_projects") { onNavigate(ProjectsRoute) } }
                item { SidebarNavItem(Icons.Default.Key, strings.apiKeysProviders, "nav_apikeys") { onNavigate(ApiKeysRoute) } }
                item { SidebarNavItem(Icons.Default.Extension, strings.pluginsTools, "nav_plugins") { onNavigate(PluginsRoute) } }
            }

            if (uiState.effectiveAdminMode) {
                item { SidebarHeader(strings.adminStudio) }
                item { SidebarNavItem(Icons.Default.Dashboard, "Overview", "nav_admin_overview") { onNavigate(AdminOverviewRoute) } }
                item { SidebarNavItem(Icons.Default.Dns, "MCP Tower (${uiState.mcpAlertCount})", "nav_admin_mcp") { onNavigate(AdminMcpRoute) } }
                item { SidebarNavItem(Icons.Default.Hub, "Swarm & Gateway", "nav_admin_ops") { onNavigate(AdminOpsRoute) } }
                item { SidebarNavItem(Icons.Default.Security, "Customers & Firewall", "nav_admin_gov") { onNavigate(AdminGovRoute) } }
            }

            item { SidebarNavItem(Icons.Default.Settings, strings.settings, "nav_settings") { onNavigate(SettingsRoute) } }
        }

        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = tokens.glassBorder)

        if (uiState.isGuest) {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = tokens.accent.copy(alpha = 0.14f),
                border = BorderStroke(1.dp, tokens.accent.copy(alpha = 0.35f))
            ) {
                Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(strings.guestHint, style = MaterialTheme.typography.labelSmall)
                    Button(
                        onClick = onOpenAuth,
                        modifier = Modifier.fillMaxWidth().testTag("sidebar_signin_btn")
                    ) {
                        Text(strings.signInSignUp)
                    }
                }
            }
        } else {
            Row(
                modifier = Modifier.fillMaxWidth().padding(4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Surface(modifier = Modifier.size(36.dp), shape = CircleShape, color = tokens.accent.copy(alpha = 0.25f)) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(uiState.authUser?.name?.firstOrNull()?.uppercase() ?: "U", fontWeight = FontWeight.Bold, color = tokens.accent)
                    }
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(uiState.authUser?.name ?: "", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("${uiState.settings.monthlyTokensUsed / 1000}k ${strings.usedSuffix}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (uiState.isAdminEligible) {
                    IconButton(onClick = onToggleAdmin) {
                        Icon(Icons.Default.AdminPanelSettings, contentDescription = "Toggle Admin Studio")
                    }
                }
            }
        }
    }
}

@Composable
private fun SidebarHeader(title: String) {
    Text(
        title.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
    )
}

@Composable
private fun SidebarSessionRow(
    session: ChatSession,
    selected: Boolean,
    onSelect: (String) -> Unit,
    onPin: (String) -> Unit,
    onDelete: (String) -> Unit
) {
    val tokens = LocalSupremeTokens.current
    Surface(
        onClick = { onSelect(session.id) },
        shape = RoundedCornerShape(10.dp),
        color = if (selected) tokens.accent.copy(alpha = 0.16f) else Color.Transparent,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.ChatBubbleOutline, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.width(8.dp))
            Text(
                session.title,
                style = MaterialTheme.typography.bodySmall,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            IconButton(onClick = { onPin(session.id) }, modifier = Modifier.size(28.dp)) {
                Icon(Icons.Default.PushPin, contentDescription = "Pin", modifier = Modifier.size(14.dp))
            }
            IconButton(onClick = { onDelete(session.id) }, modifier = Modifier.size(28.dp)) {
                Icon(Icons.Default.Close, contentDescription = "Delete", modifier = Modifier.size(14.dp))
            }
        }
    }
}

@Composable
private fun SidebarNavItem(
    icon: ImageVector,
    label: String,
    tag: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 10.dp)
            .testTag(tag),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(label, style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}
