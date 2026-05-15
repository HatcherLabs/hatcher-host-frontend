'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';

// Extend Window for vendor-prefixed SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const LS_AUTO_SPEAK_KEY = 'hatcher-voice-auto-speak';

// Shared voice-readiness promise — resolves once voices are loaded
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

function getVoicesReady(): Promise<SpeechSynthesisVoice[]> {
  if (voicesReady) return voicesReady;
  voicesReady = new Promise((resolve) => {
    const tryGetVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) return voices;
      return null;
    };

    const voices = tryGetVoices();
    if (voices) { resolve(voices); return; }

    // Chrome/Edge load voices async via voiceschanged event
    const handler = () => {
      const v = tryGetVoices();
      if (v) {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve(v);
      }
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);

    // Firefox/Safari may never fire voiceschanged — poll with increasing delays
    let attempts = 0;
    const poll = () => {
      attempts++;
      const v = tryGetVoices();
      if (v) { resolve(v); return; }
      if (attempts < 10) setTimeout(poll, 200 * attempts);
    };
    setTimeout(poll, 300);
  });
  return voicesReady;
}

function cleanSpeechText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, 'code block')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, 'image: $1')
    .trim();
}

export function useVoice(agentId?: string, options: { preferGeneratedSpeech?: boolean } = {}) {
  // STT state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [sttSupported, setSttSupported] = useState(false);

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);

  // Refs
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFinalResultRef = useRef<((text: string) => void) | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const speakRunRef = useRef(0);

  const clearAudioPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  // Check browser support on mount + warm up voices
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSttSupported(!!SpeechRecognition);

    const hasTTS = 'speechSynthesis' in window;
    setTtsSupported(hasTTS || Boolean(agentId));

    // Warm up: trigger voice loading early
    if (hasTTS) {
      getVoicesReady();
      // Unlock speechSynthesis on first user interaction (Chrome blocks without gesture)
      const unlock = () => {
        const utt = new SpeechSynthesisUtterance('');
        utt.volume = 0;
        window.speechSynthesis.speak(utt);
        window.speechSynthesis.cancel();
        document.removeEventListener('click', unlock);
        document.removeEventListener('keydown', unlock);
      };
      document.addEventListener('click', unlock, { once: true });
      document.addEventListener('keydown', unlock, { once: true });
    }

    // Restore autoSpeak preference
    try {
      const saved = localStorage.getItem(LS_AUTO_SPEAK_KEY);
      if (saved === 'true') setAutoSpeak(true);
    } catch { /* localStorage unavailable */ }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
      if (hasTTS) window.speechSynthesis.cancel();
      clearAudioPlayback();
      if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
    };
  }, [agentId, clearAudioPlayback]);

  const startListening = useCallback((onFinalResult?: (text: string) => void) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    onFinalResultRef.current = onFinalResult ?? null;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript.trim());
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (onFinalResultRef.current) {
            onFinalResultRef.current(finalTranscript.trim());
          }
          try { recognition.stop(); } catch { /* ignore */ }
        }, 1500);
      } else if (interimTranscript) {
        setTranscript(interimTranscript);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('SpeechRecognition error:', event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    setIsListening(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    const runId = ++speakRunRef.current;

    // Cancel any ongoing speech
    clearAudioPlayback();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (resumeTimerRef.current) {
      clearInterval(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }

    const cleanText = cleanSpeechText(text);

    if (!cleanText) return;

    const hasBrowserTts = 'speechSynthesis' in window;
    const shouldUseGeneratedSpeech = Boolean(agentId && (options.preferGeneratedSpeech || !hasBrowserTts));

    if (shouldUseGeneratedSpeech && agentId) {
      setIsSpeaking(true);
      const result = await api.synthesizeAgentSpeech(agentId, cleanText);
      if (runId !== speakRunRef.current) return;

      if (result.success) {
        const audioUrl = URL.createObjectURL(result.data.blob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audioUrlRef.current = audioUrl;
        audio.onended = () => {
          if (runId !== speakRunRef.current) return;
          clearAudioPlayback();
          setIsSpeaking(false);
        };
        audio.onerror = () => {
          if (runId !== speakRunRef.current) return;
          clearAudioPlayback();
          setIsSpeaking(false);
        };
        try {
          await audio.play();
          return;
        } catch (error) {
          clearAudioPlayback();
          setIsSpeaking(false);
          if (!hasBrowserTts) {
            console.warn('Failed to play generated speech:', error);
            return;
          }
        }
      } else if (!hasBrowserTts) {
        console.warn('Generated speech failed:', result.error);
        setIsSpeaking(false);
        return;
      } else {
        console.warn('Generated speech failed, falling back to browser TTS:', result.error);
        setIsSpeaking(false);
      }
    }

    if (!hasBrowserTts) return;

    // Wait for voices to be ready
    const voices = await getVoicesReady();

    // If no voices available, try forcing a reload
    if (!voices || voices.length === 0) {
      voicesReady = null; // Reset cache
      const retryVoices = await getVoicesReady();
      if (!retryVoices || retryVoices.length === 0) {
        console.warn('[TTS] No voices available');
        return;
      }
    }

    const availableVoices = window.speechSynthesis.getVoices();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;

    // Pick a voice explicitly — Chrome sometimes has no default
    const preferred = availableVoices.find(v => v.lang.startsWith('en') && v.default)
      || availableVoices.find(v => v.lang.startsWith('en'))
      || availableVoices[0];
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (resumeTimerRef.current) {
        clearInterval(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    };
    utterance.onerror = (e) => {
      // 'interrupted' fires when we cancel — not a real error
      if (e.error !== 'interrupted') {
        console.warn('SpeechSynthesis error:', e.error);
      }
      setIsSpeaking(false);
      if (resumeTimerRef.current) {
        clearInterval(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    };

    window.speechSynthesis.speak(utterance);

    // Chrome bug workaround: speech pauses after ~15s.
    // Periodic pause/resume keeps it alive.
    resumeTimerRef.current = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        if (resumeTimerRef.current) {
          clearInterval(resumeTimerRef.current);
          resumeTimerRef.current = null;
        }
      } else {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  }, [agentId, clearAudioPlayback, options.preferGeneratedSpeech]);

  const stopSpeaking = useCallback(() => {
    speakRunRef.current += 1;
    clearAudioPlayback();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (resumeTimerRef.current) {
      clearInterval(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    setIsSpeaking(false);
  }, [clearAudioPlayback]);

  const toggleAutoSpeak = useCallback(() => {
    setAutoSpeak((prev) => {
      const next = !prev;
      try { localStorage.setItem(LS_AUTO_SPEAK_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const setAutoSpeakEnabled = useCallback((enabled: boolean) => {
    setAutoSpeak(enabled);
    try { localStorage.setItem(LS_AUTO_SPEAK_KEY, String(enabled)); } catch { /* ignore */ }
  }, []);

  return {
    // STT
    isListening,
    transcript,
    sttSupported,
    startListening,
    stopListening,
    // TTS
    isSpeaking,
    ttsSupported,
    speak,
    stopSpeaking,
    // Auto-speak
    autoSpeak,
    toggleAutoSpeak,
    setAutoSpeakEnabled,
  };
}
