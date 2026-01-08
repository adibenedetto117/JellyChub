export interface EqualizerBand {
  frequency: number;
  label: string;
  gain: number;
}

export interface EqualizerPreset {
  id: string;
  name: string;
  bands: number[];
}

export const EQUALIZER_FREQUENCIES = [
  { frequency: 60, label: '60Hz' },
  { frequency: 170, label: '170Hz' },
  { frequency: 310, label: '310Hz' },
  { frequency: 600, label: '600Hz' },
  { frequency: 1000, label: '1kHz' },
  { frequency: 3000, label: '3kHz' },
  { frequency: 6000, label: '6kHz' },
  { frequency: 12000, label: '12kHz' },
  { frequency: 14000, label: '14kHz' },
  { frequency: 16000, label: '16kHz' },
];

export const EQUALIZER_PRESETS: EqualizerPreset[] = [
  {
    id: 'flat',
    name: 'Flat',
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'bass_boost',
    name: 'Bass Boost',
    bands: [6, 5, 4, 2, 1, 0, 0, 0, 0, 0],
  },
  {
    id: 'treble_boost',
    name: 'Treble Boost',
    bands: [0, 0, 0, 0, 0, 1, 2, 4, 5, 6],
  },
  {
    id: 'rock',
    name: 'Rock',
    bands: [5, 4, 3, 1, -1, -1, 1, 3, 4, 5],
  },
  {
    id: 'pop',
    name: 'Pop',
    bands: [-1, 1, 3, 4, 3, 1, -1, -1, -1, -1],
  },
  {
    id: 'jazz',
    name: 'Jazz',
    bands: [4, 3, 1, 2, -2, -2, 0, 1, 3, 4],
  },
  {
    id: 'classical',
    name: 'Classical',
    bands: [5, 4, 3, 2, -1, -1, 0, 2, 3, 4],
  },
  {
    id: 'electronic',
    name: 'Electronic',
    bands: [5, 4, 1, 0, -2, 2, 1, 1, 4, 5],
  },
  {
    id: 'hip_hop',
    name: 'Hip Hop',
    bands: [5, 4, 1, 3, -1, -1, 1, -1, 2, 3],
  },
  {
    id: 'acoustic',
    name: 'Acoustic',
    bands: [4, 3, 1, 1, 2, 2, 3, 3, 3, 2],
  },
  {
    id: 'vocal',
    name: 'Vocal',
    bands: [-2, -1, 1, 4, 5, 5, 4, 2, 0, -2],
  },
  {
    id: 'custom',
    name: 'Custom',
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
];

export const DEFAULT_EQUALIZER_PRESET = 'flat';

export const MIN_GAIN = -12;
export const MAX_GAIN = 12;

export function getPresetById(id: string): EqualizerPreset | undefined {
  return EQUALIZER_PRESETS.find((preset) => preset.id === id);
}

export function getPresetBands(presetId: string): number[] {
  const preset = getPresetById(presetId);
  return preset?.bands ?? EQUALIZER_PRESETS[0].bands;
}
