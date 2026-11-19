export interface ZipInputFile {
  path: string;
  content: string;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function sanitizeZipPath(rawPath: string): string {
  const cleaned = rawPath
    .replace(/\\/g, '/')
    .split('/')
    .filter((seg) => seg && seg !== '.' && seg !== '..')
    .join('/');
  return cleaned || 'file.txt';
}

function encodeDosTimeDate(date: Date): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosTime = ((hours & 0x1f) << 11) | ((minutes & 0x3f) << 5) | (seconds & 0x1f);
  const dosDate = (((year - 1980) & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f);
  return { dosTime, dosDate };
}

/**
 * Builds a standard PKZIP (Store / method 0, UTF-8 filenames) binary archive in memory.
 * Zero external dependencies — works offline in any browser or Node test environment.
 */
export function buildProjectZipUint8Array(files: ZipInputFile[]): Uint8Array {
  const encoder = new TextEncoder();
  const now = new Date();
  const { dosTime, dosDate } = encodeDosTimeDate(now);

  interface PreparedEntry {
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc32: number;
    localHeaderOffset: number;
  }

  const entries: PreparedEntry[] = [];
  const seenPaths = new Set<string>();
  let offset = 0;

  for (const f of files) {
    const cleanPath = sanitizeZipPath(f.path);
    if (seenPaths.has(cleanPath)) continue;
    seenPaths.add(cleanPath);

    const nameBytes = encoder.encode(cleanPath);
    const dataBytes = encoder.encode(f.content ?? '');
    const crc32 = computeCrc32(dataBytes);

    entries.push({
      nameBytes,
      dataBytes,
      crc32,
      localHeaderOffset: offset,
    });

    offset += 30 + nameBytes.length + dataBytes.length;
  }

  const centralDirectoryOffset = offset;
  let centralDirectorySize = 0;
  for (const entry of entries) {
    centralDirectorySize += 46 + entry.nameBytes.length;
  }

  const totalSize = centralDirectoryOffset + centralDirectorySize + 22;
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  // 1. Write Local File Headers + File Data
  let cursor = 0;
  for (const entry of entries) {
    view.setUint32(cursor, 0x04034b50, true); // Local file header signature
    view.setUint16(cursor + 4, 20, true); // Version needed to extract (2.0)
    view.setUint16(cursor + 6, 0x0800, true); // General purpose bit flag: UTF-8 filename
    view.setUint16(cursor + 8, 0, true); // Compression method: 0 (store)
    view.setUint16(cursor + 10, dosTime, true);
    view.setUint16(cursor + 12, dosDate, true);
    view.setUint32(cursor + 14, entry.crc32, true);
    view.setUint32(cursor + 18, entry.dataBytes.length, true); // Compressed size
    view.setUint32(cursor + 22, entry.dataBytes.length, true); // Uncompressed size
    view.setUint16(cursor + 26, entry.nameBytes.length, true);
    view.setUint16(cursor + 28, 0, true); // Extra field length
    cursor += 30;

    out.set(entry.nameBytes, cursor);
    cursor += entry.nameBytes.length;

    out.set(entry.dataBytes, cursor);
    cursor += entry.dataBytes.length;
  }

  // 2. Write Central Directory File Headers
  for (const entry of entries) {
    view.setUint32(cursor, 0x02014b50, true); // Central directory header signature
    view.setUint16(cursor + 4, 20, true); // Version made by
    view.setUint16(cursor + 6, 20, true); // Version needed to extract
    view.setUint16(cursor + 8, 0x0800, true); // UTF-8 filename flag
    view.setUint16(cursor + 10, 0, true); // Compression method: 0 (store)
    view.setUint16(cursor + 12, dosTime, true);
    view.setUint16(cursor + 14, dosDate, true);
    view.setUint32(cursor + 16, entry.crc32, true);
    view.setUint32(cursor + 20, entry.dataBytes.length, true);
    view.setUint32(cursor + 24, entry.dataBytes.length, true);
    view.setUint16(cursor + 28, entry.nameBytes.length, true);
    view.setUint16(cursor + 30, 0, true); // Extra field length
    view.setUint16(cursor + 32, 0, true); // File comment length
    view.setUint16(cursor + 34, 0, true); // Disk number start
    view.setUint16(cursor + 36, 0, true); // Internal file attributes
    view.setUint32(cursor + 38, 0, true); // External file attributes
    view.setUint32(cursor + 42, entry.localHeaderOffset, true);
    cursor += 46;

    out.set(entry.nameBytes, cursor);
    cursor += entry.nameBytes.length;
  }

  // 3. Write End of Central Directory Record (EOCD)
  view.setUint32(cursor, 0x06054b50, true);
  view.setUint16(cursor + 4, 0, true); // Number of this disk
  view.setUint16(cursor + 6, 0, true); // Disk where central directory starts
  view.setUint16(cursor + 8, entries.length, true); // Entries on this disk
  view.setUint16(cursor + 10, entries.length, true); // Total entries
  view.setUint32(cursor + 12, centralDirectorySize, true);
  view.setUint32(cursor + 16, centralDirectoryOffset, true);
  view.setUint16(cursor + 20, 0, true); // ZIP file comment length

  return out;
}

export function slugifyProjectTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'supremeai-project';
}

export function downloadProjectZip(projectTitle: string, files: ZipInputFile[]): void {
  if (!files || files.length === 0) return;
  const zipBytes = buildProjectZipUint8Array(files);
  const blob = new Blob([zipBytes as unknown as BlobPart], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${slugifyProjectTitle(projectTitle)}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
