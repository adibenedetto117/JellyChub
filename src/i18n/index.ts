import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { useSettingsStore } from '@/stores';

// Import translations
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import de from './locales/de';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

// Get device language or fallback to English
const getDeviceLanguage = (): string => {
  try {
    const locales = Localization.getLocales();
    const deviceLang = locales[0]?.languageCode || 'en';
    return SUPPORTED_LANGUAGES.find(l => l.code === deviceLang) ? deviceLang : 'en';
  } catch {
    return 'en';
  }
};

// Initialize i18n
const initI18n = () => {
  const savedLanguage = useSettingsStore.getState().language;
  const initialLanguage = savedLanguage || getDeviceLanguage();

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });

  return i18n;
};

export const changeLanguage = async (languageCode: string) => {
  await i18n.changeLanguage(languageCode);
  useSettingsStore.getState().setLanguage(languageCode);
};

export default initI18n;
export { i18n };
