/**
 * Supported Languages for ConnectX AI (Translation & Localization)
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', isTarget: true, isInput: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', isTarget: true, isInput: true },
  { code: 'hinglish', name: 'Hinglish (Romanized Hindi)', nativeName: 'Hinglish', isTarget: false, isInput: true },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', isTarget: true, isInput: true },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', isTarget: true, isInput: true },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', isTarget: true, isInput: true },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', isTarget: true, isInput: true },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', isTarget: true, isInput: true },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', isTarget: true, isInput: true },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', isTarget: true, isInput: true },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', isTarget: true, isInput: true },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', isTarget: true, isInput: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', isTarget: true, isInput: true },
  { code: 'fr', name: 'French', nativeName: 'Français', isTarget: true, isInput: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', isTarget: true, isInput: true },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', isTarget: true, isInput: true },
];

export const getLanguageByCode = (code) => {
  if (!code) return null;
  const clean = code.toLowerCase().trim();
  return SUPPORTED_LANGUAGES.find((l) => l.code === clean) || null;
};

export const isValidTargetLanguage = (code) => {
  const lang = getLanguageByCode(code);
  return Boolean(lang && lang.isTarget);
};
