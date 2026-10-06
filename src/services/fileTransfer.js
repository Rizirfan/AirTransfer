import { CHUNK_SIZE, packChunk, unpackChunk, getChunkCount } from '../utils/chunking.js';
import { encryptChunk, decryptChunk } from './encryption.js';

/**
 * File Transfer Engine managing Sequential Multi-File P2P Transfer over DataChannel
 */
export class FileTransferManager {
  /**
   * @param {import('./webrtc.js').WebRTCService} webrtcService
   */
  constructor(webrtcService) {
    this.webrtc = webrtcService;
    this.cryptoKey = null;
    this.useEncryption = false;

    // Sender state
    this.filesToSend = [];
    this.currentFileIndex = 0;
    this.isSending = false;
    this.isCancelled = false;

    // Receiver state
    this.incomingManifest = [];
    this.receivedFiles = []; // Array of { name, size, mime, blobUrl, fileId }
    this.currentReceivingFile = null;
    this.receivedChunks = [];
    this.receivedBytesCurrentFile = 0;

    // Progress metrics calculation
    this.bytesTransferredCurrentFile = 0;
    this.totalBytesAllFiles = 0;
    this.transferredBytesAllFiles = 0;
    this.startTime = 0;
    this.lastSpeedCheckTime = 0;
    this.lastSpeedCheckBytes = 0;
    this.currentSpeed = 0; // bytes/sec

    this.listeners = new Map();

    // Bind DataChannel message handler
    this.webrtc.on('datachannel-message', (data) => {
      this.handleIncomingData(data);
    });
  }

  setEncryption(useEncryption, cryptoKey = null) {
    this.useEncryption = useEncryption;
    this.cryptoKey = cryptoKey;
  }

  // ==========================================
  // SENDER METHODS
  // ==========================================

  /**
   * Sets files to send and calculates total byte count
   * @param {File[]} files
   */
  setFiles(files) {
    this.filesToSend = Array.from(files);
    this.totalBytesAllFiles = this.filesToSend.reduce((acc, f) => acc + f.size, 0);
    this.transferredBytesAllFiles = 0;
  }

  /**
   * Sends file manifest to Receiver so Receiver can preview incoming files
   */
  sendManifest() {
    const manifest = this.filesToSend.map((f, idx) => ({
      fileIndex: idx,
      name: f.name,
      size: f.size,
      mime: f.type || 'application/octet-stream'
    }));

    const message = JSON.stringify({
      type: 'file-manifest',
      files: manifest,
      encrypted: this.useEncryption
    });

    this.webrtc.send(message);
  }

  /**
   * Starts sequential transfer of all queued files
   */
  async startSending() {
    if (this.isSending || this.filesToSend.length === 0) return;

    this.isSending = true;
    this.isCancelled = false;
    this.currentFileIndex = 0;
    this.transferredBytesAllFiles = 0;
    this.startTime = Date.now();
    this.lastSpeedCheckTime = Date.now();
    this.lastSpeedCheckBytes = 0;

    for (let i = 0; i < this.filesToSend.length; i++) {
      if (this.isCancelled) break;
      this.currentFileIndex = i;
      const file = this.filesToSend[i];

      await this.sendFile(file, i);
    }

    if (!this.isCancelled) {
      this.webrtc.send(JSON.stringify({ type: 'all-complete' }));
      this.trigger('transfer-completed');
    }

    this.isSending = false;
  }

  /**
   * Transfers a single file in 64KB chunks with backpressure & encryption
   * @param {File} file
   * @param {number} fileIndex
   */
  async sendFile(file, fileIndex) {
    const totalChunks = getChunkCount(file.size);
    const fileId = `file-${fileIndex}-${Date.now()}`;

    // Send file-start control message
    const startMsg = JSON.stringify({
      type: 'file-start',
      fileIndex,
      fileId,
      name: file.name,
      size: file.size,
      mime: file.type || 'application/octet-stream',
      totalChunks,
      encrypted: this.useEncryption
    });

    this.webrtc.send(startMsg);

    this.bytesTransferredCurrentFile = 0;
    this.lastSpeedCheckTime = Date.now();
    this.lastSpeedCheckBytes = 0;

    let offset = 0;
    let chunkIndex = 0;

    while (offset < file.size) {
      if (this.isCancelled) return;

      const chunkSlice = file.slice(offset, offset + CHUNK_SIZE);
      let chunkBuffer = await chunkSlice.arrayBuffer();

      // Application-level AES-GCM encryption if enabled
      if (this.useEncryption && this.cryptoKey) {
        chunkBuffer = await encryptChunk(chunkBuffer, this.cryptoKey, chunkIndex);
      }

      // Pack metadata header + chunk payload
      const packetBuffer = packChunk(fileIndex, chunkIndex, chunkBuffer);

      // Backpressure check: Wait if DataChannel buffer is full
      await this.webrtc.waitForBuffer(256 * 1024);

      // Send binary chunk over DataChannel
      this.webrtc.send(packetBuffer);

      // Update progress metrics
      const rawChunkSize = chunkSlice.size;
      this.bytesTransferredCurrentFile += rawChunkSize;
      this.transferredBytesAllFiles += rawChunkSize;
      offset += CHUNK_SIZE;
      chunkIndex++;

      this.updateSpeedMetrics(rawChunkSize, file, fileIndex);
    }

    // Send file-end control message
    this.webrtc.send(JSON.stringify({
      type: 'file-end',
      fileIndex,
      fileId
    }));
  }

  /**
   * Updates calculation of speed, ETA, and percent progress
   */
  updateSpeedMetrics(rawChunkSize, currentFile, fileIndex) {
    const now = Date.now();
    const timeDiff = (now - this.lastSpeedCheckTime) / 1000;

    if (timeDiff >= 0.5) { // update speed calculation twice per second
      const bytesSinceLast = this.bytesTransferredCurrentFile - this.lastSpeedCheckBytes;
      this.currentSpeed = bytesSinceLast / timeDiff;

      this.lastSpeedCheckTime = now;
      this.lastSpeedCheckBytes = this.bytesTransferredCurrentFile;
    }

    const currentFileProgress = Math.min(100, Math.round((this.bytesTransferredCurrentFile / currentFile.size) * 100));
    const overallProgress = Math.min(100, Math.round((this.transferredBytesAllFiles / this.totalBytesAllFiles) * 100));
    const bytesRemaining = this.totalBytesAllFiles - this.transferredBytesAllFiles;

    this.trigger('progress', {
      fileIndex,
      fileName: currentFile.name,
      fileSize: currentFile.size,
      fileBytesTransferred: this.bytesTransferredCurrentFile,
      fileProgress: currentFileProgress,
      totalFiles: this.filesToSend.length,
      overallBytesTransferred: this.transferredBytesAllFiles,
      totalBytesAllFiles: this.totalBytesAllFiles,
      overallProgress,
      speed: this.currentSpeed,
      bytesRemaining
    });
  }

  // ==========================================
  // RECEIVER & INCOMING DATA METHODS
  // ==========================================

  /**
   * Handles incoming DataChannel messages (Control JSON strings or Binary chunks)
   * @param {string|ArrayBuffer} data
   */
  async handleIncomingData(data) {
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);
        await this.handleControlMessage(msg);
      } catch (e) {
        console.error('Failed to parse text message from DataChannel:', e);
      }
    } else if (data instanceof ArrayBuffer) {
      await this.handleBinaryChunk(data);
    }
  }

  /**
   * Handles JSON control signals
   */
  async handleControlMessage(msg) {
    switch (msg.type) {
      case 'file-manifest':
        this.incomingManifest = msg.files;
        this.useEncryption = msg.encrypted;
        this.totalBytesAllFiles = msg.files.reduce((acc, f) => acc + f.size, 0);
        this.transferredBytesAllFiles = 0;
        this.trigger('manifest-received', {
          files: msg.files,
          encrypted: msg.encrypted
        });
        break;

      case 'file-start':
        this.currentReceivingFile = msg;
        this.receivedChunks = [];
        this.receivedBytesCurrentFile = 0;
        this.lastSpeedCheckTime = Date.now();
        this.lastSpeedCheckBytes = 0;
        this.trigger('file-start', msg);
        break;

      case 'file-end':
        if (this.currentReceivingFile) {
          // Construct received Blob from collected chunk buffers
          const blob = new Blob(this.receivedChunks, { type: this.currentReceivingFile.mime });
          const blobUrl = URL.createObjectURL(blob);

          const receivedFileItem = {
            fileIndex: this.currentReceivingFile.fileIndex,
            fileId: this.currentReceivingFile.fileId,
            name: this.currentReceivingFile.name,
            size: this.currentReceivingFile.size,
            mime: this.currentReceivingFile.mime,
            blobUrl
          };

          this.receivedFiles.push(receivedFileItem);
          this.trigger('file-completed', receivedFileItem);

          this.receivedChunks = [];
          this.currentReceivingFile = null;
        }
        break;

      case 'all-complete':
        this.trigger('transfer-completed', { files: this.receivedFiles });
        break;

      case 'transfer-cancel':
        this.isCancelled = true;
        this.trigger('transfer-cancelled', { reason: msg.reason || 'Transfer was cancelled by peer.' });
        break;

      default:
        break;
    }
  }

  /**
   * Handles unpacking & optional decryption of binary chunk
   * @param {ArrayBuffer} packetBuffer
   */
  async handleBinaryChunk(packetBuffer) {
    if (!this.currentReceivingFile) return;

    try {
      const { fileIndex, chunkIndex, payload } = unpackChunk(packetBuffer);

      let chunkData = payload;

      // Decrypt if file encryption was enabled
      if (this.useEncryption && this.cryptoKey) {
        chunkData = await decryptChunk(payload, this.cryptoKey);
      }

      // Store chunk data in memory
      this.receivedChunks[chunkIndex] = chunkData;

      const chunkSize = chunkData.byteLength;
      this.receivedBytesCurrentFile += chunkSize;
      this.transferredBytesAllFiles += chunkSize;

      // Update Receiver progress metrics
      const now = Date.now();
      const timeDiff = (now - this.lastSpeedCheckTime) / 1000;

      if (timeDiff >= 0.5) {
        const bytesSinceLast = this.receivedBytesCurrentFile - this.lastSpeedCheckBytes;
        this.currentSpeed = bytesSinceLast / timeDiff;
        this.lastSpeedCheckTime = now;
        this.lastSpeedCheckBytes = this.receivedBytesCurrentFile;
      }

      const currentFileProgress = Math.min(100, Math.round((this.receivedBytesCurrentFile / this.currentReceivingFile.size) * 100));
      const overallProgress = Math.min(100, Math.round((this.transferredBytesAllFiles / this.totalBytesAllFiles) * 100));
      const bytesRemaining = this.totalBytesAllFiles - this.transferredBytesAllFiles;

      this.trigger('progress', {
        fileIndex,
        fileName: this.currentReceivingFile.name,
        fileSize: this.currentReceivingFile.size,
        fileBytesTransferred: this.receivedBytesCurrentFile,
        fileProgress: currentFileProgress,
        totalFiles: this.incomingManifest.length || 1,
        overallBytesTransferred: this.transferredBytesAllFiles,
        totalBytesAllFiles: this.totalBytesAllFiles,
        overallProgress,
        speed: this.currentSpeed,
        bytesRemaining
      });
    } catch (e) {
      console.error('Error handling binary file chunk:', e);
    }
  }

  /**
   * Cancels transfer and sends signal to peer
   * @param {string} reason
   */
  cancelTransfer(reason = 'Transfer cancelled by user.') {
    this.isCancelled = true;
    this.isSending = false;

    try {
      this.webrtc.send(JSON.stringify({
        type: 'transfer-cancel',
        reason
      }));
    } catch (e) {}

    this.trigger('transfer-cancelled', { reason });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event).filter(cb => cb !== callback);
    this.listeners.set(event, callbacks);
  }

  trigger(event, data) {
    if (this.listeners.has(event)) {
      for (const cb of this.listeners.get(event)) {
        cb(data);
      }
    }
  }
}
