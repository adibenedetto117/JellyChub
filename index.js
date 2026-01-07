// Suppress deprecation warnings from dependencies before any other code runs
import { LogBox } from 'react-native';

const SUPPRESSED_WARNINGS = ['SafeAreaView has been deprecated'];

// Patch console.warn immediately
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && SUPPRESSED_WARNINGS.some((w) => args[0].includes(w))) {
    return;
  }
  originalWarn(...args);
};

// Also suppress in LogBox
LogBox.ignoreLogs(SUPPRESSED_WARNINGS);

// Now load the actual app entry point
import 'expo-router/entry';
