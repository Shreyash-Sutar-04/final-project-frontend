import api from './api';
import { detectFoodRequest } from './voiceFoodKeywords';

export function requestMicrophonePermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('Microphone API not available in this browser.'));
  }
  return navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    stream.getTracks().forEach((track) => track.stop());
  });
}

export function getCurrentLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        latitude: null,
        longitude: null,
        warning: 'Location services are unavailable on this browser.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          warning: '',
        });
      },
      () => {
        resolve({
          latitude: null,
          longitude: null,
          warning: 'Location permission denied. Request can still be sent without GPS.',
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
}

/**
 * @param {string} lang - BCP-47 e.g. mr-IN, hi-IN, en-US
 * @returns {Promise<{ transcript: string }>}
 */
export function listenForSpeech(lang) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return Promise.reject(new Error('Speech recognition not supported'));
  }

  return new Promise((resolve, reject) => {
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    recognition.onresult = (event) => {
      let best = '';
      let bestConf = 0;
      for (let i = 0; i < event.results.length; i += 1) {
        const alt = event.results[i][0];
        if (alt.confidence >= bestConf || !best) {
          best = alt.transcript?.trim() || '';
          bestConf = alt.confidence || 0;
        }
      }
      if (!best && event.results[0]?.[0]) {
        best = event.results[0][0].transcript?.trim() || '';
      }
      finish(resolve, { transcript: best });
    };

    recognition.onerror = (event) => {
      finish(reject, new Error(event.error || 'speech-error'));
    };

    recognition.onend = () => {
      if (!settled) {
        finish(reject, new Error('no-speech'));
      }
    };

    try {
      recognition.start();
    } catch (e) {
      finish(reject, e);
    }
  });
}

export async function submitVoiceFoodRequest({ text, latitude, longitude, manualLocation }) {
  const spoken = (text || '').trim();
  if (!detectFoodRequest(spoken)) {
    const err = new Error('FOOD_KEYWORD_NOT_DETECTED');
    err.userMessage =
      "Please say you need food (e.g. 'खाना चाहिए', 'जेवण पाहिजे', 'khana chahiye', 'I need food').";
    throw err;
  }

  const { data } = await api.post(
    '/voice-request',
    {
      text: spoken,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      manualLocation: manualLocation ?? null,
      source: 'VOICE',
    },
    { skipAuth: true }
  );
  return data;
}
