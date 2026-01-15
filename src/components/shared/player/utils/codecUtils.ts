export const IMAGE_BASED_CODECS = [
  'pgs', 'pgssub', 'hdmv_pgs_subtitle', 'hdmv_pgs',
  'dvdsub', 'dvd_subtitle', 'vobsub',
  'dvbsub', 'dvb_subtitle', 'xsub',
];

export const COMPATIBLE_AUDIO_CODECS = ['aac', 'mp3', 'ac3', 'eac3', 'opus', 'vorbis'];

export function isImageBasedCodec(codec?: string): boolean {
  if (!codec) return false;
  return IMAGE_BASED_CODECS.includes(codec.toLowerCase());
}

export function isAudioCodecCompatible(codec?: string): boolean {
  if (!codec) return true;
  return COMPATIBLE_AUDIO_CODECS.includes(codec.toLowerCase());
}

export function getChannelLabel(channels?: number): string {
  if (!channels) return '';
  switch (channels) {
    case 1: return 'Mono';
    case 2: return 'Stereo';
    case 6: return '5.1';
    case 8: return '7.1';
    default: return `${channels}ch`;
  }
}

export function getChannelLabelVerbose(channels?: number): string {
  if (!channels) return '';
  switch (channels) {
    case 1: return 'Mono';
    case 2: return 'Stereo';
    case 6: return '5.1 Surround';
    case 8: return '7.1 Surround';
    default: return `${channels} channels`;
  }
}

export function getAudioCodecLabel(codec?: string): string {
  if (!codec) return '';
  const codecMap: Record<string, string> = {
    aac: 'AAC',
    ac3: 'DD',
    eac3: 'DD+',
    truehd: 'TrueHD',
    dts: 'DTS',
    'dts-hd': 'DTS-HD',
    flac: 'FLAC',
    opus: 'Opus',
    vorbis: 'Vorbis',
    mp3: 'MP3',
    pcm: 'PCM',
  };
  return codecMap[codec.toLowerCase()] || codec.toUpperCase();
}

export function getAudioCodecLabelVerbose(codec?: string): string {
  if (!codec) return '';
  const codecMap: Record<string, string> = {
    aac: 'AAC',
    ac3: 'Dolby Digital',
    eac3: 'Dolby Digital Plus',
    truehd: 'Dolby TrueHD',
    dts: 'DTS',
    'dts-hd': 'DTS-HD',
    flac: 'FLAC',
    opus: 'Opus',
    vorbis: 'Vorbis',
    mp3: 'MP3',
    pcm: 'PCM',
  };
  return codecMap[codec.toLowerCase()] || codec.toUpperCase();
}

export function getSubtitleFormatLabel(codec?: string): string {
  if (!codec) return '';
  const codecMap: Record<string, string> = {
    srt: 'SRT',
    ass: 'ASS',
    ssa: 'SSA',
    vtt: 'WebVTT',
    sub: 'SUB',
    pgs: 'PGS',
    dvdsub: 'DVD',
    dvbsub: 'DVB',
    subrip: 'SRT',
    hdmv_pgs: 'PGS',
    mov_text: 'MOV',
  };
  return codecMap[codec.toLowerCase()] || '';
}

export function getSubtitleFormatLabelVerbose(codec?: string): string {
  if (!codec) return '';
  const codecMap: Record<string, string> = {
    srt: 'SRT',
    ass: 'ASS',
    ssa: 'SSA',
    vtt: 'WebVTT',
    sub: 'SUB',
    pgs: 'PGS',
    dvdsub: 'DVD',
    dvbsub: 'DVB',
    subrip: 'SRT',
    hdmv_pgs: 'PGS',
    mov_text: 'MOV Text',
  };
  return codecMap[codec.toLowerCase()] || codec.toUpperCase();
}
