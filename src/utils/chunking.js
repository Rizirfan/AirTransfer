export const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk

/**
 * Packs metadata header (fileIndex, chunkIndex) with raw chunk payload into a single standalone ArrayBuffer
 * Header layout: 4 bytes uint32 fileIndex, 4 bytes uint32 chunkIndex = 8 bytes total header
 * 
 * @param {number} fileIndex
 * @param {number} chunkIndex
 * @param {ArrayBuffer} chunkBuffer
 * @returns {ArrayBuffer} Combined ArrayBuffer
 */
export function packChunk(fileIndex, chunkIndex, chunkBuffer) {
  const HEADER_SIZE = 8;
  const buffer = new ArrayBuffer(HEADER_SIZE + chunkBuffer.byteLength);
  const dataView = new DataView(buffer);

  dataView.setUint32(0, fileIndex, false); // Big endian uint32
  dataView.setUint32(4, chunkIndex, false);

  const uint8 = new Uint8Array(buffer, HEADER_SIZE);
  uint8.set(new Uint8Array(chunkBuffer));

  return buffer;
}

/**
 * Unpacks combined ArrayBuffer back into fileIndex, chunkIndex, and standalone payload buffer
 * 
 * @param {ArrayBuffer|ArrayBufferView} packetBuffer
 * @returns {{ fileIndex: number, chunkIndex: number, payload: ArrayBuffer }}
 */
export function unpackChunk(packetBuffer) {
  const HEADER_SIZE = 8;
  let rawBuffer = packetBuffer;
  let offset = 0;
  let length = packetBuffer.byteLength;

  if (ArrayBuffer.isView(packetBuffer)) {
    rawBuffer = packetBuffer.buffer;
    offset = packetBuffer.byteOffset;
    length = packetBuffer.byteLength;
  }

  const dataView = new DataView(rawBuffer, offset, HEADER_SIZE);
  const fileIndex = dataView.getUint32(0, false);
  const chunkIndex = dataView.getUint32(4, false);

  // Extract chunk payload as a clean standalone ArrayBuffer
  const payload = rawBuffer.slice(offset + HEADER_SIZE, offset + length);

  return { fileIndex, chunkIndex, payload };
}

/**
 * Calculates total number of chunks for a file
 * @param {number} fileSize
 * @returns {number}
 */
export function getChunkCount(fileSize) {
  return Math.ceil(fileSize / CHUNK_SIZE);
}

/**
 * Infers proper MIME type from filename extension if browser provides generic/empty MIME type
 * @param {string} filename
 * @param {string} defaultMime
 * @returns {string}
 */
export function getMimeType(filename, defaultMime) {
  if (defaultMime && defaultMime !== 'application/octet-stream' && defaultMime.trim() !== '') {
    return defaultMime;
  }

  const ext = filename?.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    case 'mp4': return 'video/mp4';
    case 'mkv': return 'video/x-matroska';
    case 'webm': return 'video/webm';
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'zip': return 'application/zip';
    case 'rar': return 'application/x-rar-compressed';
    case 'doc':
    case 'docx': return 'application/msword';
    default: return defaultMime || 'application/octet-stream';
  }
}
