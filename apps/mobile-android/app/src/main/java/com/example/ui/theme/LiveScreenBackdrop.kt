package com.example.ui.theme

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import com.example.R
import com.example.model.LiveThemeId
import com.example.model.MotionSpeed
import com.example.model.ScrimIntensity
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun LiveScreenBackdrop(
    themeId: LiveThemeId,
    motionSpeed: MotionSpeed,
    scrimIntensity: ScrimIntensity,
    isDark: Boolean,
    modifier: Modifier = Modifier
) {
    val cycleMs = (16000f / motionSpeed.multiplier).toInt().coerceIn(5000, 32000)
    val infiniteTransition = rememberInfiniteTransition(label = "backdrop_motion")
    val phase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = (2f * PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = cycleMs, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "backdrop_phase"
    )

    val photoRes: Int? = when (themeId) {
        LiveThemeId.ALPINE_DUNES -> R.drawable.bg_alpine_dunes
        LiveThemeId.MISTY_FJORDS -> R.drawable.bg_misty_fjords
        LiveThemeId.EMERALD_HIGHLANDS -> R.drawable.bg_emerald_highlands
        LiveThemeId.AMBER_CANYON -> R.drawable.bg_amber_canyon
        LiveThemeId.MIDNIGHT_PEAKS -> R.drawable.bg_obsidian_peaks
        else -> null
    }

    val scrimAlpha = when (scrimIntensity) {
        ScrimIntensity.SUBTLE -> if (isDark) 0.56f else 0.72f
        ScrimIntensity.BALANCED -> if (isDark) 0.72f else 0.84f
        ScrimIntensity.FOCUS -> if (isDark) 0.86f else 0.92f
    }
    val scrimColor = if (isDark) Color(0xFF050A14) else Color(0xFFF4F7FC)

    Box(modifier = modifier.fillMaxSize()) {
        if (photoRes != null) {
            Image(
                painter = painterResource(id = photoRes),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        } else {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val w = size.width
                val h = size.height
                when (themeId) {
                    LiveThemeId.NEBULA -> {
                        drawRect(
                            Brush.verticalGradient(
                                listOf(Color(0xFF080416), Color(0xFF190B33), Color(0xFF090D1A))
                            )
                        )
                        drawCircle(
                            brush = Brush.radialGradient(
                                colors = listOf(Color(0x88A855F7), Color.Transparent),
                                center = Offset(w * (0.3f + 0.1f * cos(phase)), h * 0.35f),
                                radius = w * 0.65f
                            ),
                            center = Offset(w * (0.3f + 0.1f * cos(phase)), h * 0.35f),
                            radius = w * 0.65f
                        )
                        drawCircle(
                            brush = Brush.radialGradient(
                                colors = listOf(Color(0x66EC4899), Color.Transparent),
                                center = Offset(w * 0.75f, h * (0.65f + 0.08f * sin(phase))),
                                radius = w * 0.55f
                            ),
                            center = Offset(w * 0.75f, h * (0.65f + 0.08f * sin(phase))),
                            radius = w * 0.55f
                        )
                        for (i in 0 until 26) {
                            val sx = ((i * 137) % 100) / 100f * w
                            val sy = ((i * 251) % 100) / 100f * h
                            val twinkle = 0.25f + 0.55f * ((sin(phase + i) + 1f) / 2f)
                            drawCircle(Color.White.copy(alpha = twinkle), radius = (i % 3 + 1.2f), center = Offset(sx, sy))
                        }
                    }
                    LiveThemeId.CYBERPUNK -> {
                        drawRect(
                            Brush.verticalGradient(
                                listOf(Color(0xFF0D0417), Color(0xFF200A35), Color(0xFF051324))
                            )
                        )
                        val gridColor = Color(0x4406B6D4)
                        val horizon = h * 0.48f
                        for (i in 0..10) {
                            val y = horizon + (h - horizon) * (i / 10f) * (i / 10f)
                            drawLine(gridColor, Offset(0f, y), Offset(w, y), strokeWidth = 1.4f)
                        }
                        for (i in -5..5) {
                            val topX = w * 0.5f + i * (w * 0.06f)
                            val bottomX = w * 0.5f + i * (w * 0.22f)
                            drawLine(Color(0x44F43F5E), Offset(topX, horizon), Offset(bottomX, h), strokeWidth = 1.3f)
                        }
                        drawCircle(
                            brush = Brush.radialGradient(
                                listOf(Color(0x88F43F5E), Color.Transparent),
                                center = Offset(w * 0.5f, horizon * (0.72f + 0.04f * sin(phase))),
                                radius = w * 0.36f
                            ),
                            center = Offset(w * 0.5f, horizon * 0.72f),
                            radius = w * 0.36f
                        )
                    }
                    LiveThemeId.AURORA_BOREALIS -> {
                        drawRect(Brush.verticalGradient(listOf(Color(0xFF030D14), Color(0xFF061E24), Color(0xFF081022))))
                        for (band in 0..2) {
                            val path = Path()
                            val baseY = h * (0.24f + band * 0.14f)
                            path.moveTo(0f, baseY)
                            for (step in 0..12) {
                                val x = w * (step / 12f)
                                val y = baseY + sin(phase + step * 0.5f + band) * 55f
                                path.lineTo(x, y)
                            }
                            drawPath(
                                path = path,
                                color = if (band == 1) Color(0x558B5CF6) else Color(0x6634D399),
                                style = Stroke(width = 72f)
                            )
                        }
                    }
                    LiveThemeId.OCEANIC_HORIZON -> {
                        drawRect(Brush.verticalGradient(listOf(Color(0xFF041628), Color(0xFF072B49), Color(0xFF03101D))))
                        for (wave in 0..3) {
                            val path = Path()
                            val baseY = h * (0.48f + wave * 0.11f)
                            path.moveTo(0f, h)
                            path.lineTo(0f, baseY)
                            for (step in 0..16) {
                                val x = w * (step / 16f)
                                val y = baseY + sin(phase + step * 0.45f + wave * 1.1f) * 26f
                                path.lineTo(x, y)
                            }
                            path.lineTo(w, h)
                            path.close()
                            drawPath(path, Color(0xFF0EA5E9).copy(alpha = 0.14f + wave * 0.04f))
                        }
                    }
                    LiveThemeId.SOLAR_MEADOW -> {
                        drawRect(Brush.verticalGradient(listOf(Color(0xFF14210D), Color(0xFF1C2D12), Color(0xFF0C170B))))
                        val sunCenter = Offset(w * 0.82f, h * 0.18f)
                        drawCircle(
                            brush = Brush.radialGradient(
                                listOf(Color(0x88FACC15), Color(0x3322C55E), Color.Transparent),
                                center = sunCenter,
                                radius = w * (0.52f + 0.06f * cos(phase))
                            ),
                            center = sunCenter,
                            radius = w * 0.58f
                        )
                    }
                    LiveThemeId.CYBER_STUDIO -> {
                        drawRect(Brush.verticalGradient(listOf(Color(0xFF050B16), Color(0xFF0A192F), Color(0xFF040914))))
                        val nodes = listOf(
                            Offset(w * 0.2f, h * 0.22f),
                            Offset(w * 0.78f, h * 0.28f),
                            Offset(w * 0.35f, h * 0.56f),
                            Offset(w * 0.82f, h * 0.68f),
                            Offset(w * 0.18f, h * 0.78f)
                        )
                        nodes.forEachIndexed { idx, p ->
                            val pulseOffset = Offset(p.x + cos(phase + idx) * 18f, p.y + sin(phase + idx) * 18f)
                            val next = nodes[(idx + 1) % nodes.size]
                            drawLine(Color(0x4406B6D4), pulseOffset, next, strokeWidth = 1.6f)
                            drawCircle(Color(0x8838BDF8), radius = 6f, center = pulseOffset)
                            drawCircle(Color(0x2206B6D4), radius = 28f, center = pulseOffset)
                        }
                    }
                    else -> {}
                }
            }
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(scrimColor.copy(alpha = scrimAlpha))
        )
    }
}
