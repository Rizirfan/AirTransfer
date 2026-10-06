export const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk

/**
 * Packs metadata header (fileIndex, chunkIndex) with raw chunk payload into a single ArrayBuffer
 * Header layout: 4 bytes uint32 fileIndex, 4 bytes uint32 chunkIndex = 8 bytes total header
 * 
 * @param {number} fileIndex
 * @param {number} chunkIndex
 * @param {ArrayBuffer} chunkBuffer
 * @returns {ArrayBuffer} Combined ArrayBuffer
 */
export function packChunk(fileIndex, chunkIndex, chunkBuffer) {
  const HEADER_SIZE = 8;
  const combined = new Uint8Array(HEADER_SIZE + chunkBuffer.byteLength);

  const dataView = new DataView(combined.buffer);
  dataView.setUint32(0, fileIndex, false); // Big endian
  dataView.setUint32(4, chunkIndex, false);

  combined.set(new Uint8Array(chunkBuffer), HEADER_SIZE);

  return combined.buffer;
}

/**
 * Unpacks combined ArrayBuffer back into fileIndex, chunkIndex, and payload buffer
 * 
 * @param {ArrayBuffer} packetBuffer
 * @returns {{ fileIndex: number, chunkIndex: number, payload: ArrayBuffer }}
 */
export function unpackChunk(packetBuffer) {
  const HEADER_SIZE = 8;
  const dataView = new DataView(packetBuffer, 0, HEADER_SIZE);

  const fileIndex = dataView.getUint32(0, false);
  const chunkIndex = dataView.getUint32(4, false);
  const payload = packetBuffer.slice(HEADER_SIZE);

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
