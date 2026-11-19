package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.LiveThemeId
import com.example.model.ThemeMode
import com.example.model.UserAccountSettings

@Immutable
data class SupremeStudioTokens(
    val accent: Color,
    val accentSecondary: Color,
    val glassSurface: Color,
    val glassBorder: Color,
    val success: Color,
    val warning: Color,
    val danger: Color,
    val codeBackground: Color,
    val codeText: Color,
    val isDark: Boolean,
    val liveThemeId: LiveThemeId,
    val themeDisplayName: String
)

val LocalSupremeTokens = staticCompositionLocalOf {
    SupremeStudioTokens(
        accent = Color(0xFF38BDF8),
        accentSecondary = Color(0xFF8B5CF6),
        glassSurface = Color(0xCC0F172A),
        glassBorder = Color(0x33FFFFFF),
        success = Color(0xFF10B981),
        warning = Color(0xFFF59E0B),
        danger = Color(0xFFF43F5E),
        codeBackground = Color(0xFF090D16),
        codeText = Color(0xFFE2E8F0),
        isDark = true,
        liveThemeId = LiveThemeId.ALPINE_DUNES,
        themeDisplayName = "Alpine Dunes"
    )
}

fun themeDisplayLabel(id: LiveThemeId): String = when (id) {
    LiveThemeId.ALPINE_DUNES -> "Alpine Dunes"
    LiveThemeId.MISTY_FJORDS -> "Misty Fjords"
    LiveThemeId.EMERALD_HIGHLANDS -> "Emerald Highlands"
    LiveThemeId.AMBER_CANYON -> "Amber Canyon"
    LiveThemeId.MIDNIGHT_PEAKS -> "Midnight Peaks"
    LiveThemeId.NEBULA -> "Cosmic Nebula"
    LiveThemeId.CYBERPUNK -> "Neon Synthwave"
    LiveThemeId.AURORA_BOREALIS -> "Aurora Borealis"
    LiveThemeId.OCEANIC_HORIZON -> "Oceanic Horizon"
    LiveThemeId.SOLAR_MEADOW -> "Solar Meadow"
    LiveThemeId.CYBER_STUDIO -> "Cyber Studio"
}

fun themeAccentPair(id: LiveThemeId): Pair<Color, Color> = when (id) {
    LiveThemeId.ALPINE_DUNES -> Color(0xFF0EA5E9) to Color(0xFF6366F1)
    LiveThemeId.MISTY_FJORDS -> Color(0xFF2DD4BF) to Color(0xFF38BDF8)
    LiveThemeId.EMERALD_HIGHLANDS -> Color(0xFF10B981) to Color(0xFF06B6D4)
    LiveThemeId.AMBER_CANYON -> Color(0xFFF59E0B) to Color(0xFFFB7185)
    LiveThemeId.MIDNIGHT_PEAKS -> Color(0xFF818CF8) to Color(0xFF38BDF8)
    LiveThemeId.NEBULA -> Color(0xFFA855F7) to Color(0xFFEC4899)
    LiveThemeId.CYBERPUNK -> Color(0xFFF43F5E) to Color(0xFF06B6D4)
    LiveThemeId.AURORA_BOREALIS -> Color(0xFF34D399) to Color(0xFF8B5CF6)
    LiveThemeId.OCEANIC_HORIZON -> Color(0xFF0284C7) to Color(0xFF22D3EE)
    LiveThemeId.SOLAR_MEADOW -> Color(0xFFEAB308) to Color(0xFF22C55E)
    LiveThemeId.CYBER_STUDIO -> Color(0xFF06B6D4) to Color(0xFF3B82F6)
}

private val SupremeTypography = Typography(
    displaySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 30.sp,
        lineHeight = 36.sp,
        letterSpacing = (-0.4).sp
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 24.sp,
        lineHeight = 30.sp
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 26.sp
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        lineHeight = 22.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 14.sp
    )
)

private val SupremeShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(22.dp),
    extraLarge = RoundedCornerShape(28.dp)
)

@Composable
fun SupremeTheme(
    settings: UserAccountSettings,
    content: @Composable () -> Unit
) {
    val systemDark = isSystemInDarkTheme()
    val useDark = when (settings.themeMode) {
        ThemeMode.DARK -> true
        ThemeMode.LIGHT -> false
        ThemeMode.SYSTEM -> systemDark
    }
    val (accent, secondary) = themeAccentPair(settings.liveThemeId)

    val colorScheme = if (useDark) {
        darkColorScheme(
            primary = accent,
            onPrimary = Color(0xFF04121E),
            primaryContainer = accent.copy(alpha = 0.20f),
            onPrimaryContainer = Color(0xFFE0F2FE),
            secondary = secondary,
            onSecondary = Color(0xFF080D1A),
            secondaryContainer = secondary.copy(alpha = 0.20f),
            onSecondaryContainer = Color(0xFFF3E8FF),
            background = Color(0xFF060B14),
            onBackground = Color(0xFFF1F5F9),
            surface = Color(0xFF0D1524),
            onSurface = Color(0xFFF1F5F9),
            surfaceVariant = Color(0xFF162033),
            onSurfaceVariant = Color(0xFFA3B3C9),
            outline = Color(0xFF28364D),
            error = Color(0xFFF43F5E),
            onError = Color.White
        )
    } else {
        lightColorScheme(
            primary = accent,
            onPrimary = Color.White,
            primaryContainer = accent.copy(alpha = 0.14f),
            onPrimaryContainer = Color(0xFF082F49),
            secondary = secondary,
            onSecondary = Color.White,
            secondaryContainer = secondary.copy(alpha = 0.14f),
            onSecondaryContainer = Color(0xFF2E1065),
            background = Color(0xFFF3F6FB),
            onBackground = Color(0xFF0F172A),
            surface = Color(0xFFFFFFFF),
            onSurface = Color(0xFF0F172A),
            surfaceVariant = Color(0xFFE6ECF5),
            onSurfaceVariant = Color(0xFF475569),
            outline = Color(0xFFCBD5E1),
            error = Color(0xFFE11D48),
            onError = Color.White
        )
    }

    val tokens = SupremeStudioTokens(
        accent = accent,
        accentSecondary = secondary,
        glassSurface = if (useDark) Color(0xCC0D1524) else Color(0xDCFFFFFF),
        glassBorder = if (useDark) Color(0x28FFFFFF) else Color(0x220F172A),
        success = Color(0xFF10B981),
        warning = Color(0xFFF59E0B),
        danger = Color(0xFFF43F5E),
        codeBackground = if (useDark) Color(0xFF050912) else Color(0xFF0F172A),
        codeText = Color(0xFFE2E8F0),
        isDark = useDark,
        liveThemeId = settings.liveThemeId,
        themeDisplayName = themeDisplayLabel(settings.liveThemeId)
    )

    CompositionLocalProvider(LocalSupremeTokens provides tokens) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = SupremeTypography,
            shapes = SupremeShapes,
            content = content
        )
    }
}
