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

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSttSupported(!!SpeechRecognition);
    setTtsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);

    // Restore autoSpeak preference
    try {
      const saved = localStorage.getItem(LS_AUTO_SPEAK_KEY);
      if (saved === 'true') setAutoSpeak(true);
    } catch { /* localStorage unavailable */ }

    return () => {
      // Cleanup on unmount
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const startListening = useCallback((onFinalResult?: (text: string) => void) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Store callback
    onFinalResultRef.current = onFinalResult ?? null;

    // Abort any existing session
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

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
        // Reset silence timer for auto-send
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          // Auto-send after 1.5s of silence following final result
          if (onFinalResultRef.current) {
            onFinalResultRef.current(finalTranscript.trim());
          }
          // Stop listening after auto-send
          try { recognition.stop(); } catch { /* ignore */ }
        }, 1500);
      } else if (interimTranscript) {
        setTranscript(interimTranscript);
        // Reset silence timer if still getting interim results
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' and 'aborted' are non-critical
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

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

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

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'en-US';
      utterance.rate = 1;
      utterance.pitch = 1;

      // Pick a voice explicitly — Chrome sometimes has no default
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith('en') && v.default)
        || voices.find(v => v.lang.startsWith('en'))
        || voices[0];
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (resumeTimer) clearInterval(resumeTimer);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        if (resumeTimer) clearInterval(resumeTimer);
      };

      window.speechSynthesis.speak(utterance);

      // Chrome bug: speechSynthesis pauses after ~15s. Keep it alive.
      const resumeTimer = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(resumeTimer);
        } else {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);
    };

    // Voices may not be loaded yet (Chrome async loading)
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak();
    } else {
      // Wait for voices to load
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak();
      };
      // Fallback if onvoiceschanged never fires (some browsers)
      setTimeout(() => {
        if (!window.speechSynthesis.speaking) doSpeak();
      }, 300);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
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
