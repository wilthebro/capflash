export interface WhisperModelEntry {
  id: string;
  label: string;
  englishOnly: boolean;
  /** Approximate total download at q8 from the Hub; replaced by live sizes when available. */
  approxBytes: number;
}

const MB = 1_000_000;

/**
 * Whisper models used for word-level captions: the `_timestamped` variants are
 * trained to emit cross-attention-derived word timestamps. `.en` models are the
 * same size but faster per token — they only speak English.
 */
export const WHISPER_MODELS: WhisperModelEntry[] = [
  { id: 'onnx-community/whisper-tiny_timestamped', label: 'Tiny', englishOnly: false, approxBytes: 45 * MB },
  { id: 'onnx-community/whisper-tiny.en_timestamped', label: 'Tiny (English only)', englishOnly: true, approxBytes: 45 * MB },
  { id: 'onnx-community/whisper-base_timestamped', label: 'Base', englishOnly: false, approxBytes: 82 * MB },
  { id: 'onnx-community/whisper-base.en_timestamped', label: 'Base (English only)', englishOnly: true, approxBytes: 82 * MB },
  { id: 'onnx-community/whisper-small_timestamped', label: 'Small', englishOnly: false, approxBytes: 253 * MB },
  { id: 'onnx-community/whisper-small.en_timestamped', label: 'Small (English only)', englishOnly: true, approxBytes: 253 * MB },
];

export const DEFAULT_WHISPER_MODEL = 'onnx-community/whisper-base_timestamped';

export function whisperModel(id: string): WhisperModelEntry | undefined {
  return WHISPER_MODELS.find((m) => m.id === id);
}

/**
 * Spoken language for multilingual models. transformers.js does not detect the
 * language itself — it falls back to English when none is given — so the user
 * picks it explicitly. English-only models reject a language argument entirely.
 */
export const WHISPER_LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'nl', label: 'Dutch' },
  { code: 'sv', label: 'Swedish' },
  { code: 'da', label: 'Danish' },
  { code: 'no', label: 'Norwegian' },
  { code: 'fi', label: 'Finnish' },
  { code: 'pl', label: 'Polish' },
  { code: 'cs', label: 'Czech' },
  { code: 'ro', label: 'Romanian' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'el', label: 'Greek' },
  { code: 'ru', label: 'Russian' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'tr', label: 'Turkish' },
  { code: 'he', label: 'Hebrew' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'id', label: 'Indonesian' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'th', label: 'Thai' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
];

export const DEFAULT_WHISPER_LANGUAGE = 'en';

const MODEL_KEY = 'captioner.whisper.model';
const LANGUAGE_KEY = 'captioner.whisper.language';

export function loadWhisperPrefs(): { modelId: string; language: string } {
  let modelId = DEFAULT_WHISPER_MODEL;
  let language = DEFAULT_WHISPER_LANGUAGE;
  try {
    const storedModel = localStorage.getItem(MODEL_KEY);
    if (storedModel && whisperModel(storedModel)) modelId = storedModel;
    const storedLanguage = localStorage.getItem(LANGUAGE_KEY);
    if (storedLanguage && WHISPER_LANGUAGES.some((l) => l.code === storedLanguage)) language = storedLanguage;
  } catch {
    // Storage can be unavailable (private mode); fall back to the defaults.
  }
  return { modelId, language };
}

export function saveWhisperPrefs(prefs: { modelId: string; language: string }): void {
  try {
    localStorage.setItem(MODEL_KEY, prefs.modelId);
    localStorage.setItem(LANGUAGE_KEY, prefs.language);
  } catch {
    // Ignore — the choice just will not persist.
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  const mb = bytes / MB;
  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}
