'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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

export function useVoice() {
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

  // Check browser support on mount + warm up voices
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSttSupported(!!SpeechRecognition);

    const hasTTS = 'speechSynthesis' in window;
    setTtsSupported(hasTTS);

    // Warm up: trigger voice loading early
    if (hasTTS) getVoicesReady();

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
      if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
    };
  }, []);

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
    if (!('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    if (resumeTimerRef.current) {
      clearInterval(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }

    // Strip markdown-like formatting for cleaner speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'code block')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, 'image: $1')
      .trim();

    if (!cleanText) return;

    // Wait for voices to be ready
    const voices = await getVoicesReady();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;

    // Pick a voice explicitly — Chrome sometimes has no default
    const preferred = voices.find(v => v.lang.startsWith('en') && v.default)
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0];
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
  }, []);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (resumeTimerRef.current) {
      clearInterval(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const toggleAutoSpeak = useCallback(() => {
    setAutoSpeak((prev) => {
      const next = !prev;
      try { localStorage.setItem(LS_AUTO_SPEAK_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
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
  };
}
