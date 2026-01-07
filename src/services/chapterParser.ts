/**
 * M4B/MP4 Chapter Parser
 * Parses chapter metadata from M4B audiobook files by fetching file headers
 */

export interface ParsedChapter {
  name: string;
  startMs: number;
}

// MP4 box/atom types we care about
const BOX_TYPES = {
  MOOV: 'moov',
  UDTA: 'udta',
  CHPL: 'chpl', // Nero-style chapters
  TRAK: 'trak',
  MDIA: 'mdia',
  MINF: 'minf',
  STBL: 'stbl',
  STTS: 'stts',
  CTTS: 'ctts',
  MVHD: 'mvhd',
};

/**
 * Parse chapters from an M4B/MP4 file URL
 * Uses range requests to only fetch necessary data
 */
export async function parseM4BChapters(url: string): Promise<ParsedChapter[]> {
  if (!url) {
    console.log('Chapter parser: No URL provided');
    return [];
  }

  try {
    console.log('Chapter parser: Fetching file header...');

    // Create an abort controller with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    // First, try to fetch just the beginning (most M4B files have moov at start)
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Range: 'bytes=0-4194304', // 4MB should be enough for metadata
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // If range requests aren't supported, try regular fetch
    if (response.status === 200) {
      console.log('Chapter parser: Server returned full file, range not supported');
    } else if (response.status === 206) {
      console.log('Chapter parser: Got partial content (range request worked)');
    } else if (!response.ok) {
      console.log('Chapter parser: Failed to fetch file header, status:', response.status);
      return [];
    }

    const buffer = await response.arrayBuffer();
    const data = new DataView(buffer);
    console.log('Chapter parser: Got buffer of size:', buffer.byteLength);

    // List all top-level boxes for debugging
    listTopLevelBoxes(data);

    // Find moov box
    let moovBox = findBox(data, 0, data.byteLength, BOX_TYPES.MOOV);
    let moovData = data;

    // Check if moov extends beyond our buffer - if so, fetch the complete moov
    if (moovBox && moovBox.offset + moovBox.size > data.byteLength) {
      console.log(`Chapter parser: moov (${moovBox.size} bytes) extends beyond buffer (${data.byteLength} bytes), fetching complete moov...`);

      try {
        const moovResponse = await fetch(url, {
          headers: {
            Range: `bytes=${moovBox.offset}-${moovBox.offset + moovBox.size - 1}`,
          },
        });

        if (moovResponse.ok || moovResponse.status === 206) {
          const moovBuffer = await moovResponse.arrayBuffer();
          moovData = new DataView(moovBuffer);
          console.log(`Chapter parser: Got complete moov, size: ${moovBuffer.byteLength}`);
          // Update moov box to point to start of new buffer
          moovBox = { offset: 0, size: moovBox.size, type: 'moov' };
        }
      } catch (e) {
        console.log('Chapter parser: Error fetching complete moov', e);
      }
    }

    if (!moovBox) {
      console.log('Chapter parser: No moov box in first chunk - trying to fetch from end of file');

      // Try to get file size from Content-Range header or fetch HEAD
      const contentRange = response.headers.get('Content-Range');
      let fileSize = 0;

      if (contentRange) {
        // Format: "bytes 0-4194304/123456789"
        const match = contentRange.match(/\/(\d+)/);
        if (match) {
          fileSize = parseInt(match[1], 10);
        }
      }

      if (!fileSize) {
        // Try HEAD request to get file size
        try {
          const headResponse = await fetch(url, { method: 'HEAD' });
          const contentLength = headResponse.headers.get('Content-Length');
          if (contentLength) {
            fileSize = parseInt(contentLength, 10);
          }
        } catch (e) {
          console.log('Chapter parser: Could not get file size');
        }
      }

      if (fileSize > 0) {
        // Find where mdat ends by reading mdat size from first chunk
        // Structure: ftyp + free + mdat (huge) + moov (at end)
        let mdatEnd = 0;
        let offset = 0;
        while (offset < data.byteLength - 8) {
          const boxSize = data.getUint32(offset);
          const boxType = String.fromCharCode(
            data.getUint8(offset + 4),
            data.getUint8(offset + 5),
            data.getUint8(offset + 6),
            data.getUint8(offset + 7)
          );

          console.log(`Chapter parser: Box at offset ${offset}: type='${boxType}', size=${boxSize}`);

          if (boxSize === 0) {
            console.log('Chapter parser: Box size is 0, breaking');
            break;
          }

          if (boxType === 'mdat') {
            // Check for extended size (64-bit)
            if (boxSize === 1) {
              // Extended size is next 8 bytes
              const highBits = data.getUint32(offset + 8);
              const lowBits = data.getUint32(offset + 12);
              const extendedSize = highBits * 0x100000000 + lowBits;
              mdatEnd = offset + extendedSize;
              console.log(`Chapter parser: Found mdat with extended size, ends at ${mdatEnd}`);
            } else {
              mdatEnd = offset + boxSize;
              console.log(`Chapter parser: Found mdat, ends at ${mdatEnd}`);
            }
            break;
          }

          // For boxes larger than our buffer, we can't skip past them
          // This shouldn't happen for ftyp/free/moov but would for mdat
          if (boxSize > data.byteLength - offset) {
            console.log(`Chapter parser: Box '${boxType}' is larger than buffer, cannot continue scanning`);
            break;
          }

          offset += boxSize;
        }

        // Calculate moov position
        let moovStart: number;
        let fetchSize: number;

        if (mdatEnd > 0) {
          // We know where mdat ends, moov should be right after
          moovStart = mdatEnd;
          fetchSize = fileSize - moovStart;
          console.log(`Chapter parser: mdat ends at ${mdatEnd}, moov should be at ${moovStart}, moov size ~${fetchSize} bytes`);

          // Cap at 20MB max to avoid huge downloads, but fetch full moov if smaller
          if (fetchSize > 20971520) {
            console.log('Chapter parser: moov appears very large, capping fetch at 20MB');
            moovStart = fileSize - 20971520;
            fetchSize = 20971520;
          }
        } else {
          // Couldn't find mdat - maybe there's a large 'free' atom
          // Try progressively larger chunks from the end
          console.log('Chapter parser: Could not determine mdat end, will try fetching from end');
          moovStart = 0; // Will be set in the loop below
          fetchSize = 0;
        }

        // If we couldn't find mdat, try progressively larger chunks
        const fetchSizes = mdatEnd > 0
          ? [fetchSize]
          : [1048576, 2097152, 4194304, 8388608]; // 1MB, 2MB, 4MB, 8MB

        for (const size of fetchSizes) {
          const startPos = Math.max(0, fileSize - size);
          console.log(`Chapter parser: File size is ${fileSize}, fetching from ${startPos} (${size} bytes)...`);

          try {
            const endResponse = await fetch(url, {
              headers: {
                Range: `bytes=${startPos}-${fileSize - 1}`,
              },
            });

            if (endResponse.ok || endResponse.status === 206) {
              const endBuffer = await endResponse.arrayBuffer();
              const endData = new DataView(endBuffer);
              console.log('Chapter parser: Got end of file, size:', endBuffer.byteLength);
              listTopLevelBoxes(endData);

              moovBox = findBox(endData, 0, endData.byteLength, BOX_TYPES.MOOV);

              // If not found with normal parsing, try brute-force scan for 'moov' signature
              if (!moovBox) {
                console.log('Chapter parser: Normal parsing failed, trying brute-force scan for moov...');
                moovBox = bruteForceFind(endData, 'moov');
              }

              if (moovBox) {
                console.log(`Chapter parser: Found moov at end of file, offset ${moovBox.offset}, size ${moovBox.size}`);
                // Continue with this data
                const result = parseChaptersFromMoov(endData, moovBox);
                if (result.length > 0) return result;
              } else {
                console.log('Chapter parser: No moov found in this range, trying larger fetch...');
              }
            }
          } catch (e) {
            console.log('Chapter parser: Error fetching end of file', e);
          }

          // If we found moov already or this was a known fetch size, don't try more
          if (mdatEnd > 0) break;
        }

        if (!moovBox) {
          console.log('Chapter parser: Could not find moov after all attempts');
        }
      }

      return [];
    }

    console.log(`Chapter parser: Found moov box at offset ${moovBox.offset}, size ${moovBox.size}`);
    return parseChaptersFromMoov(moovData, moovBox);
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.log('Chapter parser: Request timed out after 15 seconds');
    } else {
      console.log('Chapter parser: Error parsing file', error?.message || error);
    }
    return [];
  }
}

/**
 * Parse chapters from a moov box
 */
function parseChaptersFromMoov(data: DataView, moovBox: Box): ParsedChapter[] {
  const moovEnd = Math.min(moovBox.offset + moovBox.size, data.byteLength);

  // Look for udta/chpl (Nero chapters)
  const udtaBox = findBox(data, moovBox.offset + 8, moovEnd, BOX_TYPES.UDTA);
  if (udtaBox) {
    console.log(`Chapter parser: Found udta box at offset ${udtaBox.offset}`);
    const chplBox = findBox(data, udtaBox.offset + 8, Math.min(udtaBox.offset + udtaBox.size, data.byteLength), BOX_TYPES.CHPL);
    if (chplBox) {
      console.log(`Chapter parser: Found chpl box at offset ${chplBox.offset}`);
      const chapters = parseChplBox(data, chplBox.offset, chplBox.size);
      if (chapters.length > 0) {
        console.log(`Chapter parser: Found ${chapters.length} Nero chapters`);
        return chapters;
      }
    } else {
      console.log('Chapter parser: No chpl box found in udta');
    }
  } else {
    console.log('Chapter parser: No udta box found in moov');
  }

  // Try to find chapters in other common locations (QuickTime style)
  const chapters = parseAlternativeChapters(data, moovBox);
  if (chapters.length > 0) {
    return chapters;
  }

  console.log('Chapter parser: No chapters found in moov');
  return [];
}

function listTopLevelBoxes(data: DataView) {
  let offset = 0;
  const boxes: string[] = [];

  while (offset < data.byteLength - 8) {
    try {
      const size = data.getUint32(offset);
      const type = String.fromCharCode(
        data.getUint8(offset + 4),
        data.getUint8(offset + 5),
        data.getUint8(offset + 6),
        data.getUint8(offset + 7)
      );

      if (size === 0 || size > data.byteLength - offset) break;
      boxes.push(`${type}(${size})`);
      offset += size;
    } catch {
      break;
    }
  }

  console.log('Chapter parser: Top-level boxes:', boxes.join(', '));
}

interface Box {
  offset: number;
  size: number;
  type: string;
}

function findBox(data: DataView, start: number, end: number, targetType: string): Box | null {
  let offset = start;

  while (offset < end - 8) {
    try {
      let size = data.getUint32(offset);
      const type = String.fromCharCode(
        data.getUint8(offset + 4),
        data.getUint8(offset + 5),
        data.getUint8(offset + 6),
        data.getUint8(offset + 7)
      );

      // Handle extended size (64-bit)
      let headerSize = 8;
      if (size === 1 && offset + 16 <= end) {
        const highBits = data.getUint32(offset + 8);
        const lowBits = data.getUint32(offset + 12);
        size = highBits * 0x100000000 + lowBits;
        headerSize = 16;
      }

      if (size === 0) break;

      if (type === targetType) {
        return { offset, size, type };
      }

      // If box extends beyond our data, we can't continue scanning
      // but if we're looking for moov it might be AFTER this box
      if (size > end - offset) {
        // Try to continue scanning after where this box should end
        // This won't work for sequential scanning but helps if moov is at a known location
        break;
      }

      offset += size;
    } catch {
      break;
    }
  }

  return null;
}

/**
 * Brute-force scan for a box type signature anywhere in the data
 * This is a fallback when normal box parsing fails
 */
function bruteForceFind(data: DataView, targetType: string): Box | null {
  const target = [
    targetType.charCodeAt(0),
    targetType.charCodeAt(1),
    targetType.charCodeAt(2),
    targetType.charCodeAt(3),
  ];

  // Scan through the data looking for the signature
  for (let i = 4; i < data.byteLength - 4; i++) {
    if (
      data.getUint8(i) === target[0] &&
      data.getUint8(i + 1) === target[1] &&
      data.getUint8(i + 2) === target[2] &&
      data.getUint8(i + 3) === target[3]
    ) {
      // Found potential match - the size should be in the 4 bytes before
      const offset = i - 4;
      let size = data.getUint32(offset);

      // Handle extended size
      if (size === 1 && i + 12 < data.byteLength) {
        const highBits = data.getUint32(i + 4);
        const lowBits = data.getUint32(i + 8);
        size = highBits * 0x100000000 + lowBits;
      }

      // Sanity check: size should be reasonable
      if (size >= 8 && size <= data.byteLength - offset + 1000000) {
        console.log(`Chapter parser: Brute-force found '${targetType}' at offset ${offset}, size ${size}`);
        return { offset, size, type: targetType };
      }
    }
  }

  return null;
}

function findAllBoxes(data: DataView, start: number, end: number, targetType: string): Box[] {
  const boxes: Box[] = [];
  let offset = start;

  while (offset < end - 8) {
    try {
      const size = data.getUint32(offset);
      const type = String.fromCharCode(
        data.getUint8(offset + 4),
        data.getUint8(offset + 5),
        data.getUint8(offset + 6),
        data.getUint8(offset + 7)
      );

      if (size === 0 || size > end - offset) break;

      if (type === targetType) {
        boxes.push({ offset, size, type });
      }

      offset += size;
    } catch {
      break;
    }
  }

  return boxes;
}

/**
 * Parse Nero-style chpl box
 * Format: version(4) + unknown(1) + entry_count(4) + entries
 * Entry: timestamp(8) + name_length(1) + name
 */
function parseChplBox(data: DataView, offset: number, size: number): ParsedChapter[] {
  const chapters: ParsedChapter[] = [];

  try {
    let pos = offset + 8; // Skip box header
    const version = data.getUint32(pos);
    pos += 4;

    // Skip unknown byte
    pos += 1;

    const entryCount = data.getUint32(pos);
    pos += 4;

    for (let i = 0; i < entryCount && pos < offset + size - 9; i++) {
      // Timestamp is in 100ns units
      const timestampHigh = data.getUint32(pos);
      const timestampLow = data.getUint32(pos + 4);
      pos += 8;

      // Convert to milliseconds (timestamp is in 100ns units)
      const timestamp100ns = timestampHigh * 0x100000000 + timestampLow;
      const startMs = Math.floor(timestamp100ns / 10000);

      const nameLength = data.getUint8(pos);
      pos += 1;

      let name = '';
      for (let j = 0; j < nameLength && pos + j < offset + size; j++) {
        name += String.fromCharCode(data.getUint8(pos + j));
      }
      pos += nameLength;

      chapters.push({
        name: name.trim() || `Chapter ${i + 1}`,
        startMs,
      });
    }
  } catch (e) {
    console.log('Chapter parser: Error parsing chpl box', e);
  }

  return chapters;
}

/**
 * Try alternative chapter locations (QuickTime style)
 */
function parseAlternativeChapters(data: DataView, moovBox: Box): ParsedChapter[] {
  const moovEnd = Math.min(moovBox.offset + moovBox.size, data.byteLength);

  // List all boxes inside moov for debugging
  let offset = moovBox.offset + 8;
  const moovChildren: string[] = [];
  while (offset < moovEnd - 8) {
    try {
      const size = data.getUint32(offset);
      const type = String.fromCharCode(
        data.getUint8(offset + 4),
        data.getUint8(offset + 5),
        data.getUint8(offset + 6),
        data.getUint8(offset + 7)
      );
      if (size === 0 || size > moovEnd - offset) break;
      moovChildren.push(type);
      offset += size;
    } catch {
      break;
    }
  }
  console.log('Chapter parser: Boxes inside moov:', moovChildren.join(', '));

  // Get timescale from mvhd
  let timescale = 1000;
  const mvhd = findBox(data, moovBox.offset + 8, moovEnd, 'mvhd');
  if (mvhd) {
    try {
      const version = data.getUint8(mvhd.offset + 8);
      // timescale is at offset 12 (v0) or 20 (v1)
      const tsOffset = version === 0 ? mvhd.offset + 20 : mvhd.offset + 28;
      timescale = data.getUint32(tsOffset);
      console.log(`Chapter parser: Movie timescale: ${timescale}`);
    } catch (e) {
      console.log('Chapter parser: Could not read timescale');
    }
  }

  // Find all trak boxes
  const traks = findAllBoxes(data, moovBox.offset + 8, moovEnd, 'trak');
  console.log(`Chapter parser: Found ${traks.length} trak boxes`);

  // First pass: find chapter track ID from tref/chap reference
  let chapterTrackId = 0;
  for (const trak of traks) {
    const trakEnd = Math.min(trak.offset + trak.size, data.byteLength);
    const tref = findBox(data, trak.offset + 8, trakEnd, 'tref');
    if (tref) {
      const chap = findBox(data, tref.offset + 8, Math.min(tref.offset + tref.size, data.byteLength), 'chap');
      if (chap && chap.size >= 12) {
        // chap box contains track IDs it references
        chapterTrackId = data.getUint32(chap.offset + 8);
        console.log(`Chapter parser: Found chapter track reference to track ${chapterTrackId}`);
        break;
      }
    }
  }

  // Second pass: find text tracks and extract chapters
  for (const trak of traks) {
    const trakEnd = Math.min(trak.offset + trak.size, data.byteLength);

    // Get track ID from tkhd
    let trackId = 0;
    const tkhd = findBox(data, trak.offset + 8, trakEnd, 'tkhd');
    if (tkhd) {
      try {
        const version = data.getUint8(tkhd.offset + 8);
        const idOffset = version === 0 ? tkhd.offset + 20 : tkhd.offset + 28;
        trackId = data.getUint32(idOffset);
      } catch (e) {}
    }

    // Look for mdia -> hdlr to identify track type
    const mdia = findBox(data, trak.offset + 8, trakEnd, 'mdia');
    if (!mdia) continue;

    const mdiaEnd = Math.min(mdia.offset + mdia.size, data.byteLength);
    const hdlr = findBox(data, mdia.offset + 8, mdiaEnd, 'hdlr');
    if (!hdlr) continue;

    // hdlr box: size(4) + type(4) + version(1) + flags(3) + pre_defined(4) + handler_type(4)
    let handlerType = '';
    try {
      handlerType = String.fromCharCode(
        data.getUint8(hdlr.offset + 16),
        data.getUint8(hdlr.offset + 17),
        data.getUint8(hdlr.offset + 18),
        data.getUint8(hdlr.offset + 19)
      );
      console.log(`Chapter parser: Track ${trackId} handler type: ${handlerType}`);
    } catch (e) {
      continue;
    }

    // Check if this is a text track (chapters are in text tracks)
    if (handlerType === 'text' || (chapterTrackId > 0 && trackId === chapterTrackId)) {
      console.log(`Chapter parser: Processing text/chapter track ${trackId}`);

      // Get track timescale from mdhd
      let trackTimescale = timescale;
      const mdhd = findBox(data, mdia.offset + 8, mdiaEnd, 'mdhd');
      if (mdhd) {
        try {
          const version = data.getUint8(mdhd.offset + 8);
          const tsOffset = version === 0 ? mdhd.offset + 20 : mdhd.offset + 28;
          trackTimescale = data.getUint32(tsOffset);
          console.log(`Chapter parser: Track timescale: ${trackTimescale}`);
        } catch (e) {}
      }

      // Find minf -> stbl -> stts (time-to-sample) and stsz (sample sizes)
      const minf = findBox(data, mdia.offset + 8, mdiaEnd, 'minf');
      if (!minf) continue;

      const minfEnd = Math.min(minf.offset + minf.size, data.byteLength);
      const stbl = findBox(data, minf.offset + 8, minfEnd, 'stbl');
      if (!stbl) continue;

      const stblEnd = Math.min(stbl.offset + stbl.size, data.byteLength);

      // Parse stts for timing
      const stts = findBox(data, stbl.offset + 8, stblEnd, 'stts');
      const chapters: ParsedChapter[] = [];

      if (stts) {
        try {
          const entryCount = data.getUint32(stts.offset + 12);
          console.log(`Chapter parser: stts has ${entryCount} entries`);

          let currentTime = 0;
          let sampleIndex = 0;
          let pos = stts.offset + 16;

          for (let i = 0; i < entryCount && pos < stts.offset + stts.size - 8; i++) {
            const sampleCount = data.getUint32(pos);
            const sampleDelta = data.getUint32(pos + 4);
            pos += 8;

            for (let j = 0; j < sampleCount; j++) {
              const startMs = Math.floor((currentTime * 1000) / trackTimescale);
              chapters.push({
                name: `Chapter ${sampleIndex + 1}`,
                startMs,
              });
              currentTime += sampleDelta;
              sampleIndex++;
            }
          }
        } catch (e) {
          console.log('Chapter parser: Error parsing stts', e);
        }
      }

      if (chapters.length > 0) {
        console.log(`Chapter parser: Found ${chapters.length} QuickTime chapters`);
        return chapters;
      }
    }
  }

  return [];
}

/**
 * Try to parse QuickTime-style chapters from trak boxes
 */
function parseQuickTimeChapters(data: DataView, moovBox: Box): ParsedChapter[] {
  // This is more complex - QuickTime chapters are in a separate text track
  // For now, we'll focus on Nero chapters which are more common in M4B files
  return [];
}

/**
 * Convert ticks to milliseconds (Jellyfin format)
 */
export function chaptersToTicks(chapters: ParsedChapter[]): Array<{
  Name: string;
  StartPositionTicks: number;
}> {
  return chapters.map((ch) => ({
    Name: ch.name,
    StartPositionTicks: ch.startMs * 10000, // Convert ms to ticks
  }));
}
