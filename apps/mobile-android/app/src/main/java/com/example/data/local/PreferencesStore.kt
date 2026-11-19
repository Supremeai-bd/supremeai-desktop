package com.example.data.local

import android.content.Context
import androidx.core.content.edit
import com.example.data.catalog.StudioCatalogs
import com.example.data.model.AuthUser
import com.example.data.model.PlanTier
import com.example.data.model.PluginItem
import com.example.data.model.TeamMember
import com.example.data.model.UserAccountSettings
import com.example.data.model.WebhookItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class PreferencesStore(context: Context) {
    private val prefs = context.getSharedPreferences("supremeai_studio_prefs", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    private val _settings = MutableStateFlow(loadSettings())
    val settings: StateFlow<UserAccountSettings> = _settings.asStateFlow()

    private val _authUser = MutableStateFlow(loadUser())
    val authUser: StateFlow<AuthUser> = _authUser.asStateFlow()

    private val _plugins = MutableStateFlow(loadPlugins())
    val plugins: StateFlow<List<PluginItem>> = _plugins.asStateFlow()

    private val _webhooks = MutableStateFlow(loadWebhooks())
    val webhooks: StateFlow<List<WebhookItem>> = _webhooks.asStateFlow()

    private val _teamMembers = MutableStateFlow(loadTeamMembers())
    val teamMembers: StateFlow<List<TeamMember>> = _teamMembers.asStateFlow()

    private val _adminAuthenticated = MutableStateFlow(prefs.getBoolean(KEY_ADMIN_AUTH, false))
    val adminAuthenticated: StateFlow<Boolean> = _adminAuthenticated.asStateFlow()

    fun getSessionToken(): String? = prefs.getString(KEY_TOKEN, null)

    fun saveSessionToken(token: String?) {
        prefs.edit {
            if (token == null) remove(KEY_TOKEN) else putString(KEY_TOKEN, token)
        }
    }

    fun updateSettings(transform: (UserAccountSettings) -> UserAccountSettings) {
        val next = transform(_settings.value)
        _settings.value = next
        prefs.edit { putString(KEY_SETTINGS, json.encodeToString(next)) }
    }

    fun updateAuthUser(user: AuthUser) {
        _authUser.value = user
        prefs.edit { putString(KEY_USER, json.encodeToString(user)) }
    }

    fun resetToGuest(): AuthUser {
        val guest = defaultGuestUser()
        saveSessionToken(null)
        updateAuthUser(guest)
        return guest
    }

    fun deductCredits(amount: Int) {
        val cur = _authUser.value
        val updated = cur.copy(creditsRemaining = (cur.creditsRemaining - amount).coerceAtLeast(0))
        updateAuthUser(updated)
    }

    fun topUpCredits(amount: Int) {
        val cur = _authUser.value
        val updated = cur.copy(
            creditsRemaining = cur.creditsRemaining + amount,
            creditsTotal = maxOf(cur.creditsTotal, cur.creditsRemaining + amount)
        )
        updateAuthUser(updated)
    }

    fun togglePlugin(pluginId: String) {
        val next = _plugins.value.map {
            if (it.id == pluginId) it.copy(isEnabled = !it.isEnabled) else it
        }
        _plugins.value = next
        prefs.edit { putString(KEY_PLUGINS, json.encodeToString(next)) }
    }

    fun addWebhook(url: String, events: List<String>) {
        val item = WebhookItem(
            id = "wh-${System.currentTimeMillis()}",
            url = url,
            events = events,
            isActive = true,
            lastStatusCode = 200
        )
        val next = listOf(item) + _webhooks.value
        _webhooks.value = next
        prefs.edit { putString(KEY_WEBHOOKS, json.encodeToString(next)) }
    }

    fun deleteWebhook(id: String) {
        val next = _webhooks.value.filterNot { it.id == id }
        _webhooks.value = next
        prefs.edit { putString(KEY_WEBHOOKS, json.encodeToString(next)) }
    }

    fun addTeamMember(name: String, email: String, role: String) {
        val item = TeamMember(
            id = "tm-${System.currentTimeMillis()}",
            name = name,
            email = email,
            role = role,
            status = "Invited",
            lastActiveLabel = "Just invited"
        )
        val next = _teamMembers.value + item
        _teamMembers.value = next
        prefs.edit { putString(KEY_TEAM, json.encodeToString(next)) }
    }

    fun removeTeamMember(id: String) {
        val next = _teamMembers.value.filterNot { it.id == id }
        _teamMembers.value = next
        prefs.edit { putString(KEY_TEAM, json.encodeToString(next)) }
    }

    fun setAdminAuthenticated(authenticated: Boolean) {
        _adminAuthenticated.value = authenticated
        prefs.edit { putBoolean(KEY_ADMIN_AUTH, authenticated) }
    }

    private fun loadSettings(): UserAccountSettings {
        val raw = prefs.getString(KEY_SETTINGS, null) ?: return UserAccountSettings()
        return runCatching { json.decodeFromString<UserAccountSettings>(raw) }
            .getOrDefault(UserAccountSettings())
    }

    private fun loadUser(): AuthUser {
        val raw = prefs.getString(KEY_USER, null) ?: return defaultGuestUser()
        return runCatching { json.decodeFromString<AuthUser>(raw) }
            .getOrDefault(defaultGuestUser())
    }

    private fun loadPlugins(): List<PluginItem> {
        val raw = prefs.getString(KEY_PLUGINS, null) ?: return StudioCatalogs.defaultPlugins
        return runCatching { json.decodeFromString<List<PluginItem>>(raw) }
            .getOrDefault(StudioCatalogs.defaultPlugins)
    }

    private fun loadWebhooks(): List<WebhookItem> {
        val raw = prefs.getString(KEY_WEBHOOKS, null) ?: return defaultWebhooks()
        return runCatching { json.decodeFromString<List<WebhookItem>>(raw) }
            .getOrDefault(defaultWebhooks())
    }

    private fun loadTeamMembers(): List<TeamMember> {
        val raw = prefs.getString(KEY_TEAM, null) ?: return StudioCatalogs.defaultTeamMembers
        return runCatching { json.decodeFromString<List<TeamMember>>(raw) }
            .getOrDefault(StudioCatalogs.defaultTeamMembers)
    }

    private fun defaultGuestUser() = AuthUser(
        id = "guest-local",
        name = "Studio Guest",
        email = "guest@supremeai.local",
        role = "member",
        plan = PlanTier.FREE,
        isGuest = true,
        creditsRemaining = 1_000,
        creditsTotal = 1_000,
        avatarInitials = "SG"
    )

    private fun defaultWebhooks() = listOf(
        WebhookItem(
            id = "wh-default",
            url = "https://hooks.supremeai.studio/v1/events",
            events = listOf("chat.completed", "research.ready"),
            isActive = true,
            lastStatusCode = 200
        )
    )

    companion object {
        private const val KEY_SETTINGS = "settings_json"
        private const val KEY_USER = "auth_user_json"
        private const val KEY_TOKEN = "session_bearer_token"
        private const val KEY_PLUGINS = "plugins_json"
        private const val KEY_WEBHOOKS = "webhooks_json"
        private const val KEY_TEAM = "team_members_json"
        private const val KEY_ADMIN_AUTH = "admin_authenticated"
    }
}
