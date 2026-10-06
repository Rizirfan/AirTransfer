/**
 * WebRTC Service Wrapper for RTCPeerConnection and RTCDataChannel
 * 
 * Strict Architecture:
 * - Manages direct browser-to-browser P2P connection.
 * - Handles DataChannel lifecycle and ICE server configurations.
 */

export class WebRTCService {
  /**
   * @param {{ iceServers: Array<{ urls: string, username?: string, credential?: string }> }} config
   */
  constructor(config = {}) {
    this.config = config.iceServers ? config : {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    /** @type {RTCPeerConnection|null} */
    this.peerConnection = null;
    /** @type {RTCDataChannel|null} */
    this.dataChannel = null;

    this.listeners = new Map();
    this.pendingIceCandidates = [];
  }

  /**
   * Initializes RTCPeerConnection and attaches connection state handlers
   */
  initPeerConnection() {
    if (this.peerConnection) return;

    this.peerConnection = new RTCPeerConnection(this.config);

    // Monitor Connection State
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      this.trigger('connection-state', state);
    };

    // Monitor ICE Connection State
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection.iceConnectionState;
      this.trigger('ice-state', state);
    };

    // Handle ICE Candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.trigger('ice-candidate', event.candidate);
      }
    };

    // Handle Incoming DataChannel (Receiver side)
    this.peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };
  }

  /**
   * Sender creates DataChannel
   */
  createDataChannel() {
    if (!this.peerConnection) this.initPeerConnection();

    const channel = this.peerConnection.createDataChannel('file-transfer', {
      ordered: true
    });
    this.setupDataChannel(channel);
  }

  /**
   * Binds DataChannel handlers & backpressure thresholds
   * @param {RTCDataChannel} channel
   */
  setupDataChannel(channel) {
    this.dataChannel = channel;
    this.dataChannel.binaryType = 'arraybuffer';

    // Set low threshold for backpressure management (64 KB)
    this.dataChannel.bufferedAmountLowThreshold = 64 * 1024;

    this.dataChannel.onopen = () => {
      this.trigger('datachannel-open');
    };

    this.dataChannel.onclose = () => {
      this.trigger('datachannel-close');
    };

    this.dataChannel.onerror = (error) => {
      this.trigger('datachannel-error', error);
    };

    this.dataChannel.onmessage = (event) => {
      this.trigger('datachannel-message', event.data);
    };

    this.dataChannel.onbufferedamountlow = () => {
      this.trigger('buffered-amount-low');
    };
  }

  /**
   * Generates SDP Offer (Sender)
   * @returns {Promise<RTCSessionDescriptionInit>}
   */
  async createOffer() {
    if (!this.peerConnection) this.initPeerConnection();
    if (!this.dataChannel) this.createDataChannel();

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  /**
   * Receives SDP Offer and generates SDP Answer (Receiver)
   * @param {RTCSessionDescriptionInit} offer
   * @returns {Promise<RTCSessionDescriptionInit>}
   */
  async createAnswer(offer) {
    if (!this.peerConnection) this.initPeerConnection();

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    
    // Drain queued ICE candidates if any were received before remote description
    await this.drainPendingIceCandidates();

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  /**
   * Sets SDP Answer from Receiver (Sender side)
   * @param {RTCSessionDescriptionInit} answer
   */
  async setAnswer(answer) {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    await this.drainPendingIceCandidates();
  }

  /**
   * Adds received ICE Candidate
   * @param {RTCIceCandidateInit} candidate
   */
  async addIceCandidate(candidate) {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.pendingIceCandidates.push(candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('Error adding ICE candidate:', e);
    }
  }

  async drainPendingIceCandidates() {
    while (this.pendingIceCandidates.length > 0) {
      const candidate = this.pendingIceCandidates.shift();
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding queued ICE candidate:', e);
      }
    }
  }

  /**
   * Backpressure helper: Waits until bufferedAmount drops below safe threshold (256 KB)
   * @param {number} maxBufferedAmount Default 256 KB
   * @returns {Promise<void>}
   */
  async waitForBuffer(maxBufferedAmount = 256 * 1024) {
    if (!this.dataChannel) return;

    if (this.dataChannel.bufferedAmount <= maxBufferedAmount) {
      return;
    }

    return new Promise((resolve) => {
      const checkBuffer = () => {
        if (!this.dataChannel || this.dataChannel.bufferedAmount <= maxBufferedAmount) {
          this.off('buffered-amount-low', checkBuffer);
          resolve();
        }
      };

      this.on('buffered-amount-low', checkBuffer);
      
      // Fallback polling interval in case event is missed
      const interval = setInterval(() => {
        if (!this.dataChannel || this.dataChannel.bufferedAmount <= maxBufferedAmount) {
          clearInterval(interval);
          this.off('buffered-amount-low', checkBuffer);
          resolve();
        }
      }, 50);
    });
  }

  /**
   * Sends binary or text payload through DataChannel
   * @param {string|ArrayBuffer|Blob} data
   */
  send(data) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(data);
    } else {
      throw new Error('DataChannel is not open');
    }
  }

  /**
   * Closes WebRTC PeerConnection and DataChannel
   */
  close() {
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch (e) {}
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {}
      this.peerConnection = null;
    }

    this.pendingIceCandidates = [];
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
