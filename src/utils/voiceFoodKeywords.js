/**
 * Flexible keyword matching for voice food requests (Marathi, Hindi, English).
 * Includes Devanagari and common romanized / partial phrases users actually say.
 */

export const VOICE_LANG_OPTIONS = [
  { code: 'mr-IN', label: 'मराठी' },
  { code: 'hi-IN', label: 'हिंदी' },
  { code: 'en-US', label: 'English' },
];

export const VOICE_EXAMPLE_PHRASES = [
  'मला जेवण पाहिजे',
  'मुझे खाना चाहिए',
  'I need food',
];

/** Single keywords or short phrases — match if transcript includes any (case-insensitive). */
export const FOOD_REQUEST_KEYWORDS = [
  // English
  'food',
  'hungry',
  'hunger',
  'starving',
  'starve',
  'meal',
  'meals',
  'eat',
  'eating',
  'lunch',
  'dinner',
  'breakfast',
  'snack',
  'need food',
  'need food help',
  'need meal',
  'need help',
  'i need food',
  'i need food help',
  'i am hungry',
  "i'm hungry",
  'food help',
  'please food',
  'want food',
  'no food',

  // Hindi (Devanagari)
  'खाना',
  'खाने',
  'भूख',
  'भूखा',
  'भूखी',
  'भोजन',
  'रोटी',
  'खाना चाहिए',
  'खाना चाहिये',
  'मुझे खाना',
  'मुझे खाना चाहिए',
  'भूख लगी',
  'भूख लग रही',
  'भूख लगा',
  'भूखा हूँ',
  'भूखी हूँ',
  'मदद चाहिए',
  'अन्न',
  'भोजन चाहिए',
  'पेट',
  'पेट में',

  // Hindi (romanized — speech-to-text often outputs these)
  'khana',
  'khaana',
  'khane',
  'chahiye',
  'chaiye',
  'chahie',
  'mujhe khana',
  'mujhe khaana',
  'khana chahiye',
  'khaana chahiye',
  'bhook',
  'bhuk',
  'bhukh',
  'bhookh',
  'bhook lagi',
  'bhukh lagi',
  'bhook lag rahi',
  'bhookha',
  'bhookhi',
  'bhookha hun',
  'roti',
  'anna',
  'ann',
  'bhojan',
  'pet me',
  'khana do',
  'khana de',
  'madad chahiye',

  // Marathi (Devanagari)
  'जेवण',
  'जेवणाची',
  'अन्न',
  'भूक',
  'भुकेला',
  'भुकेली',
  'मला जेवण',
  'मला जेवण पाहिजे',
  'जेवण पाहिजे',
  'जेवण हवे',
  'अन्न पाहिजे',
  'अन्न हवे',
  'मदत पाहिजे',
  'भूक लागली',
  'भूक लागलं',
  'भूक लागली आहे',
  'खायला',
  'खायला पाहिजे',
  'भुकेलो',
  'भुकेल्या',
  'पोट',
  'पोटाला',

  // Marathi (romanized)
  'jevan',
  'jevaan',
  'jevan pahije',
  'jevan paahije',
  'pahije',
  'paahije',
  'hawe',
  'haave',
  'anna pahije',
  'anna hawe',
  'mala jevan',
  'mala jevan pahije',
  'mala anna',
  'bhuk',
  'bhuk lagli',
  'bhuk lagali',
  'bhukela',
  'bhukeli',
  'khayla',
  'khayla pahije',
  'madat pahije',
  'pot',
  'potala',
];

/**
 * Detect food/hunger intent from spoken or typed text.
 * @param {string} text
 * @returns {boolean}
 */
export function detectFoodRequest(text) {
  const normalized = normalizeTranscript(text);
  if (!normalized) return false;

  return FOOD_REQUEST_KEYWORDS.some((keyword) => {
    const k = normalizeTranscript(keyword);
    return k && normalized.includes(k);
  });
}

export function normalizeTranscript(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[.,!?;:'"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported() {
  return !!getSpeechRecognitionCtor();
}
