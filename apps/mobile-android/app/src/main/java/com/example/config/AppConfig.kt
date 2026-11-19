package com.example.config

import com.example.BuildConfig

object AppConfig {
    const val apiBaseUrl: String = "https://supremeai-api-ulw0.onrender.com"
    const val gatewayUrl: String = "https://supremeai-api-ulw0.onrender.com"
    const val mcpTowerUrl: String = "https://supremeai-mcp-tower.onrender.com"

    private const val PLACEHOLDER_PASSKEY = "ADMIN_PASSKEY_DEFAULT_VALUE"

    val adminPasskeyHintConfigured: Boolean
        get() = BuildConfig.ADMIN_PASSKEY.isNotBlank() && BuildConfig.ADMIN_PASSKEY != PLACEHOLDER_PASSKEY

    fun matchesAdminPasskey(input: String): Boolean {
        val clean = input.trim()
        val configured = BuildConfig.ADMIN_PASSKEY
        return if (configured.isNotBlank() && configured != PLACEHOLDER_PASSKEY) {
            clean == configured || (clean.length == 6 && clean.all { it.isDigit() })
        } else {
            clean.length >= 6
        }
    }
}
