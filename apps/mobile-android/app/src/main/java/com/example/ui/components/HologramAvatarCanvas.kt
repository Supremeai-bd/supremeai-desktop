package com.example.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.example.R
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun HologramAvatarCanvas(
    isListening: Boolean,
    isSpeaking: Boolean,
    rmsLevel: Float,
    size: Dp = 180.dp,
    modifier: Modifier = Modifier
) {
    val transition = rememberInfiniteTransition(label = "hologram_pulse")
    val orbit by transition.animateFloat(
        initialValue = 0f,
        targetValue = (2f * PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = if (isSpeaking) 2200 else 4600, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "orbit"
    )
    val breathe by transition.animateFloat(
        initialValue = 0.92f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = if (isListening || isSpeaking) 650 else 1800),
            repeatMode = RepeatMode.Reverse
        ),
        label = "breathe"
    )

    val primary = MaterialTheme.colorScheme.primary
    val secondary = MaterialTheme.colorScheme.secondary
    val activeGlow = when {
        isSpeaking -> Color(0xFF10B981)
        isListening -> Color(0xFF38BDF8)
        else -> primary
    }

    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier.size(size)
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val r = this.size.minDimension / 2f
            val center = Offset(this.size.width / 2f, this.size.height / 2f)
            val energyBoost = (rmsLevel * 0.16f) + if (isSpeaking) 0.10f else 0f

            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(activeGlow.copy(alpha = 0.36f), Color.Transparent),
                    center = center,
                    radius = r * (0.95f + energyBoost)
                ),
                radius = r * (0.95f + energyBoost),
                center = center
            )

            drawCircle(
                color = activeGlow.copy(alpha = 0.55f),
                radius = r * 0.78f * breathe.coerceAtMost(1.04f),
                center = center,
                style = Stroke(width = 2.5f)
            )

            drawCircle(
                color = secondary.copy(alpha = 0.35f),
                radius = r * 0.89f,
                center = center,
                style = Stroke(width = 1.5f)
            )

            val nodeCount = 12
            for (i in 0 until nodeCount) {
                val angle = orbit + (i * (2f * PI.toFloat() / nodeCount))
                val wave = 1f + (if (isSpeaking || isListening) 0.08f * sin(angle * 3f + orbit) else 0f)
                val px = center.x + cos(angle) * r * 0.89f * wave
                val py = center.y + sin(angle) * r * 0.89f * wave
                drawCircle(
                    color = if (i % 2 == 0) activeGlow else secondary,
                    radius = if (isSpeaking || isListening) 4.2f else 3f,
                    center = Offset(px, py)
                )
            }
        }

        Image(
            painter = painterResource(id = R.drawable.img_avatar_hologram),
            contentDescription = "SupremeAI Voice Hologram Avatar",
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxSize()
                .padding(22.dp)
                .clip(CircleShape)
        )
    }
}
