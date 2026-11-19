package com.example.ui.components

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.example.R
import com.example.i18n.AppStrings
import com.example.model.AvatarPreset
import com.example.ui.theme.LocalSupremeTokens
import com.example.voice.VoiceStatus

@Composable
fun LiveVoicePanel(
    voiceStatus: VoiceStatus,
    inputLevel: Float,
    outputLevel: Float,
    lastTranscript: String,
    avatarPreset: AvatarPreset,
    micSensitivity: Float,
    voicePitch: Float,
    strings: AppStrings,
    onStartListening: () -> Unit,
    onStopListening: () -> Unit,
    onStopSpeaking: () -> Unit,
    onMicSensitivityChange: (Float) -> Unit,
    onVoicePitchChange: (Float) -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val tokens = LocalSupremeTokens.current
    var permissionDenied by remember { mutableStateOf(false) }

    val micPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            permissionDenied = false
            onStartListening()
        } else {
            permissionDenied = true
        }
    }

    val pulseTransition = rememberInfiniteTransition(label = "avatar_pulse")
    val pulse by pulseTransition.animateFloat(
        initialValue = 0.88f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_scale"
    )

    val audioBoost = (inputLevel * micSensitivity).coerceIn(0f, 1.3f) + outputLevel

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        shape = RoundedCornerShape(22.dp),
        color = tokens.glassSurface,
        border = BorderStroke(1.dp, tokens.accent.copy(alpha = 0.45f))
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier.size(72.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val ringColor = when (voiceStatus) {
                            VoiceStatus.LISTENING -> tokens.success
                            VoiceStatus.SPEAKING -> tokens.accent
                            VoiceStatus.ERROR -> tokens.danger
                            else -> tokens.accentSecondary
                        }
                        val dynamicRadius = (size.minDimension / 2f) * (0.76f + 0.14f * pulse + 0.1f * audioBoost.coerceAtMost(1f))
                        drawCircle(
                            color = ringColor.copy(alpha = 0.25f),
                            radius = dynamicRadius
                        )
                        drawCircle(
                            color = ringColor.copy(alpha = 0.75f),
                            radius = dynamicRadius * 0.9f,
                            style = Stroke(width = 3f)
                        )
                    }
                    if (avatarPreset == AvatarPreset.HOLOGRAM_MALE) {
                        Image(
                            painter = painterResource(id = R.drawable.avatar_hologram_male),
                            contentDescription = "Hologram Voice Avatar",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(54.dp)
                                .clip(CircleShape)
                        )
                    } else {
                        Surface(
                            modifier = Modifier.size(54.dp),
                            shape = CircleShape,
                            color = tokens.accent.copy(alpha = 0.24f)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = if (avatarPreset == AvatarPreset.CYBER_ORBIT) Icons.Default.GraphicEq else Icons.Default.AutoAwesome,
                                    contentDescription = "Voice Avatar",
                                    tint = tokens.accent
                                )
                            }
                        }
                    }
                }

                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    val statusLabel = when (voiceStatus) {
                        VoiceStatus.LISTENING -> strings.voiceStatusListening
                        VoiceStatus.SPEAKING -> strings.voiceStatusSpeaking
                        VoiceStatus.CONNECTING -> "Connecting mic..."
                        VoiceStatus.ERROR -> "Speech recognizer unavailable"
                        VoiceStatus.IDLE -> strings.voiceStatusReady
                    }
                    Text(statusLabel, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    if (lastTranscript.isNotBlank()) {
                        Text(
                            "\"$lastTranscript\"",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    } else if (permissionDenied) {
                        Text(
                            "Microphone permission is required for voice input.",
                            style = MaterialTheme.typography.bodySmall,
                            color = tokens.danger
                        )
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (voiceStatus == VoiceStatus.SPEAKING) {
                        FilledTonalIconButton(
                            onClick = onStopSpeaking,
                            modifier = Modifier.testTag("voice_stop_speak_btn")
                        ) {
                            Icon(Icons.Default.VolumeOff, contentDescription = "Stop speaking")
                        }
                    }
                    FilledIconButton(
                        onClick = {
                            if (voiceStatus == VoiceStatus.LISTENING) {
                                onStopListening()
                            } else {
                                val hasPerm = ContextCompat.checkSelfPermission(
                                    context,
                                    Manifest.permission.RECORD_AUDIO
                                ) == PackageManager.PERMISSION_GRANTED
                                if (hasPerm) {
                                    permissionDenied = false
                                    onStartListening()
                                } else {
                                    micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                                }
                            }
                        },
                        colors = IconButtonDefaults.filledIconButtonColors(
                            containerColor = if (voiceStatus == VoiceStatus.LISTENING) tokens.danger else tokens.accent
                        ),
                        modifier = Modifier.testTag("voice_mic_action_btn")
                    ) {
                        Icon(
                            imageVector = if (voiceStatus == VoiceStatus.LISTENING) Icons.Default.Stop else Icons.Default.Mic,
                            contentDescription = if (voiceStatus == VoiceStatus.LISTENING) "Stop listening" else "Start listening",
                            tint = Color.White
                        )
                    }
                    IconButton(onClick = onClose, modifier = Modifier.testTag("voice_panel_close_btn")) {
                        Icon(Icons.Default.Close, contentDescription = strings.close)
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "${strings.micSensitivity}: ${(micSensitivity * 100).toInt()}%",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Slider(
                        value = micSensitivity,
                        onValueChange = onMicSensitivityChange,
                        valueRange = 0.5f..1.8f
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "${strings.voicePitchLabel}: ${"%.2f".format(voicePitch)}x",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Slider(
                        value = voicePitch,
                        onValueChange = onVoicePitchChange,
                        valueRange = 0.7f..1.4f
                    )
                }
            }
        }
    }
}
