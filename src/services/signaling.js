import { io } from 'socket.io-client';
import { encryptPayload, decryptPayload } from './encryption.js';

class SignalingService {
  constructor() {
    /** @type {import('socket.io-client').Socket|null} */
    this.socket = null;
    /** @type {CryptoKey|null} */
    this.sessionKey = null;
    this.listeners = new Map();
  }

  /**
   * Initializes socket connection
   * @param {string} [serverUrl]
   */
  connect(serverUrl) {
    const targetUrl = serverUrl || import.meta.env.VITE_SIGNALING_SERVER_URL || window.location.origin;
    if (this.socket && this.socket.connected) return;

    this.socket = io(targetUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.trigger('connection-status', { status: 'connected', socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      this.trigger('connection-status', { status: 'disconnected', reason });
    });

    this.socket.on('connect_error', (error) => {
      this.trigger('connection-status', { status: 'error', error: error.message });
    });

    this.socket.on('session-created', (data) => {
      this.trigger('session-created', data);
    });

    this.socket.on('session-joined', (data) => {
      this.trigger('session-joined', data);
    });

    this.socket.on('peer-connected', (data) => {
      this.trigger('peer-connected', data);
    });

    this.socket.on('peer-disconnected', (data) => {
      this.trigger('peer-disconnected', data);
    });

    this.socket.on('session-expired', (data) => {
      this.trigger('session-expired', data);
    });

    this.socket.on('error-message', (data) => {
      this.trigger('error-message', data);
    });

    // Handle SDP Offer
    this.socket.on('offer', async ({ senderId, offer, payload }) => {
      let decodedOffer = offer;
      if (payload && this.sessionKey) {
        try {
          decodedOffer = await decryptPayload(payload, this.sessionKey);
        } catch (e) {
          console.error('Failed to decrypt SDP offer payload:', e);
        }
      }
      this.trigger('offer', { senderId, offer: decodedOffer });
    });

    // Handle SDP Answer
    this.socket.on('answer', async ({ receiverId, answer, payload }) => {
      let decodedAnswer = answer;
      if (payload && this.sessionKey) {
        try {
          decodedAnswer = await decryptPayload(payload, this.sessionKey);
        } catch (e) {
          console.error('Failed to decrypt SDP answer payload:', e);
        }
      }
      this.trigger('answer', { receiverId, answer: decodedAnswer });
    });

    // Handle ICE Candidate
    this.socket.on('ice-candidate', async ({ from, candidate, payload }) => {
      let decodedCandidate = candidate;
      if (payload && this.sessionKey) {
        try {
          decodedCandidate = await decryptPayload(payload, this.sessionKey);
        } catch (e) {
          console.error('Failed to decrypt ICE candidate payload:', e);
        }
      }
      this.trigger('ice-candidate', { from, candidate: decodedCandidate });
    });
  }

  /**
   * Sets the AES key for signaling encryption
   * @param {CryptoKey} key
   */
  setSessionKey(key) {
    this.sessionKey = key;
  }

  createSession() {
    if (!this.socket) this.connect();
    this.socket.emit('create-session');
  }

  joinSession(sessionId) {
    if (!this.socket) this.connect();
    this.socket.emit('join-session', { sessionId });
  }

  async sendOffer(sessionId, offer) {
    if (!this.socket) return;
    let payload = null;
    if (this.sessionKey) {
      payload = await encryptPayload(offer, this.sessionKey);
    }
    this.socket.emit('offer', { sessionId, offer, payload });
  }

  async sendAnswer(sessionId, answer) {
    if (!this.socket) return;
    let payload = null;
    if (this.sessionKey) {
      payload = await encryptPayload(answer, this.sessionKey);
    }
    this.socket.emit('answer', { sessionId, answer, payload });
  }

  async sendIceCandidate(sessionId, candidate) {
    if (!this.socket) return;
    let payload = null;
    if (this.sessionKey) {
      payload = await encryptPayload(candidate, this.sessionKey);
    }
    this.socket.emit('ice-candidate', { sessionId, candidate, payload });
  }

  leaveSession(sessionId) {
    if (!this.socket) return;
    this.socket.emit('leave-session', { sessionId });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.sessionKey = null;
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

  removeAllListeners() {
    this.listeners.clear();
  }

  trigger(event, data) {
    if (this.listeners.has(event)) {
      for (const cb of this.listeners.get(event)) {
        cb(data);
      }
    }
  }
}

export const signalingService = new SignalingService();
