package com.example.voice

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import com.example.i18n.detectBengaliOrBanglish
import com.example.model.AppLanguage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale

enum class VoiceStatus { IDLE, CONNECTING, LISTENING, SPEAKING, ERROR }

class VoiceCompanionManager(private val context: Context) {
    private val _status = MutableStateFlow(VoiceStatus.IDLE)
    val status: StateFlow<VoiceStatus> = _status.asStateFlow()

    private val _outputLevel = MutableStateFlow(0f)
    val outputLevel: StateFlow<Float> = _outputLevel.asStateFlow()

    private val _inputLevel = MutableStateFlow(0f)
    val inputLevel: StateFlow<Float> = _inputLevel.asStateFlow()

    private val _lastTranscript = MutableStateFlow("")
    val lastTranscript: StateFlow<String> = _lastTranscript.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var speechRecognizer: SpeechRecognizer? = null
    private var currentPitch: Float = 1.0f
    private var currentLanguage: AppLanguage = AppLanguage.EN

    init {
        initTts()
    }

    private fun initTts() {
        tts = TextToSpeech(context.applicationContext) { initStatus ->
            if (initStatus == TextToSpeech.SUCCESS) {
                ttsReady = true
                applyLanguage(currentLanguage)
                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {
                        _status.value = VoiceStatus.SPEAKING
                        _outputLevel.value = 0.78f
                    }

                    override fun onDone(utteranceId: String?) {
                        _outputLevel.value = 0f
                        if (_status.value == VoiceStatus.SPEAKING) {
                            _status.value = VoiceStatus.IDLE
                        }
                    }

                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) {
                        _outputLevel.value = 0f
                        _status.value = VoiceStatus.IDLE
                    }
                })
            }
        }
    }

    fun updateSettings(language: AppLanguage, pitch: Float) {
        currentLanguage = language
        currentPitch = pitch.coerceIn(0.65f, 1.55f)
        if (ttsReady) {
            applyLanguage(language)
            tts?.setPitch(currentPitch)
        }
    }

    private fun applyLanguage(language: AppLanguage) {
        val engine = tts ?: return
        if (language == AppLanguage.BN) {
            val bnBd = Locale("bn", "BD")
            val bnIn = Locale("bn", "IN")
            val res = engine.setLanguage(bnBd)
            if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                val fallback = engine.setLanguage(bnIn)
                if (fallback == TextToSpeech.LANG_MISSING_DATA || fallback == TextToSpeech.LANG_NOT_SUPPORTED) {
                    engine.setLanguage(Locale.US)
                }
            }
        } else {
            engine.setLanguage(Locale.US)
        }
    }

    fun speak(rawText: String, preferredLanguage: AppLanguage = currentLanguage) {
        val cleaned = rawText
            .replace(Regex("```[\\s\\S]*?```"), " code block ")
            .replace(Regex("[#*`_>]"), "")
            .trim()
        if (cleaned.isBlank() || !ttsReady) return

        val effectiveLang = if (preferredLanguage == AppLanguage.BN || detectBengaliOrBanglish(cleaned)) {
            AppLanguage.BN
        } else {
            AppLanguage.EN
        }
        applyLanguage(effectiveLang)
        tts?.setPitch(currentPitch)
        val params = Bundle().apply {
            putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, "utt_${System.currentTimeMillis()}")
        }
        tts?.speak(cleaned.take(1200), TextToSpeech.QUEUE_FLUSH, params, "utt_${System.currentTimeMillis()}")
    }

    fun stopSpeaking() {
        tts?.stop()
        _outputLevel.value = 0f
        if (_status.value == VoiceStatus.SPEAKING) {
            _status.value = VoiceStatus.IDLE
        }
    }

    fun startListening(language: AppLanguage, onResult: (String) -> Unit) {
        _errorMessage.value = null
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            _errorMessage.value = "Speech recognition service is unavailable on this device."
            _status.value = VoiceStatus.ERROR
            return
        }
        stopListening()
        _status.value = VoiceStatus.CONNECTING

        val recognizer = SpeechRecognizer.createSpeechRecognizer(context)
        speechRecognizer = recognizer
        recognizer.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                _status.value = VoiceStatus.LISTENING
            }

            override fun onBeginningOfSpeech() {
                _status.value = VoiceStatus.LISTENING
            }

            override fun onRmsChanged(rmsdB: Float) {
                val normalized = ((rmsdB + 2f) / 12f).coerceIn(0f, 1f)
                _inputLevel.value = normalized
            }

            override fun onBufferReceived(buffer: ByteArray?) {}

            override fun onEndOfSpeech() {
                _inputLevel.value = 0f
            }

            override fun onError(error: Int) {
                _inputLevel.value = 0f
                _status.value = VoiceStatus.IDLE
                if (error != SpeechRecognizer.ERROR_NO_MATCH && error != SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
                    _errorMessage.value = "Voice input paused (code $error)."
                }
            }

            override fun onResults(results: Bundle?) {
                _inputLevel.value = 0f
                _status.value = VoiceStatus.IDLE
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val text = matches?.firstOrNull()?.trim().orEmpty()
                if (text.isNotBlank()) {
                    _lastTranscript.value = text
                    onResult(text)
                }
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val partial = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                if (!partial.isNullOrBlank()) {
                    _lastTranscript.value = partial
                }
            }

            override fun onEvent(eventType: Int, params: Bundle?) {}
        })

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(
                RecognizerIntent.EXTRA_LANGUAGE,
                if (language == AppLanguage.BN) "bn-BD" else "en-US"
            )
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        }
        recognizer.startListening(intent)
    }

    fun stopListening() {
        speechRecognizer?.stopListening()
        speechRecognizer?.destroy()
        speechRecognizer = null
        _inputLevel.value = 0f
        if (_status.value == VoiceStatus.LISTENING || _status.value == VoiceStatus.CONNECTING) {
            _status.value = VoiceStatus.IDLE
        }
    }

    fun release() {
        stopListening()
        tts?.stop()
        tts?.shutdown()
        tts = null
    }
}
