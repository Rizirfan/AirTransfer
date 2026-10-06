/**
 * In-Memory Session Manager for WebRTC Signaling
 * 
 * Strict Architectural Rule:
 * The signaling server ONLY coordinates the WebRTC peer connections.
 * It NEVER receives, stores, or handles file contents.
 */

class SessionManager {
  constructor() {
    /** @type {Map<string, { sessionId: string, sender: string, receiver: string | null, createdAt: number, expiresAt: number, lastActivity: number }>} */
    this.sessions = new Map();
    /** @type {Map<string, string>} Maps socketId to sessionId for fast lookup */
    this.socketToSession = new Map();
  }

  /**
   * Creates a new temporary sharing session
   * @param {string} sessionId
   * @param {string} senderSocketId
   * @param {number} expiryMinutes
   * @returns {object} Session object
   */
  createSession(sessionId, senderSocketId, expiryMinutes = 15) {
    const now = Date.now();
    const expiresAt = now + expiryMinutes * 60 * 1000;

    const session = {
      sessionId,
      sender: senderSocketId,
      receiver: null,
      createdAt: now,
      lastActivity: now,
      expiresAt
    };

    this.sessions.set(sessionId, session);
    this.socketToSession.set(senderSocketId, sessionId);
    return session;
  }

  /**
   * Retrieves an active session by ID
   * @param {string} sessionId
   * @returns {object|null}
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check if session has expired
    if (Date.now() > session.expiresAt) {
      this.removeSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Joins an existing session as Receiver
   * Enforces max 2 participants per session rule
   * @param {string} sessionId
   * @param {string} receiverSocketId
   * @returns {{ success: boolean, reason?: string, session?: object }}
   */
  joinSession(sessionId, receiverSocketId) {
    const session = this.getSession(sessionId);

    if (!session) {
      return { success: false, reason: 'Session not found or has expired.' };
    }

    if (session.receiver && session.receiver !== receiverSocketId) {
      return { success: false, reason: 'This session already has two participants.' };
    }

    session.receiver = receiverSocketId;
    session.lastActivity = Date.now();
    this.socketToSession.set(receiverSocketId, sessionId);

    return { success: true, session };
  }

  /**
   * Removes a session and unbinds socket mappings
   * @param {string} sessionId
   */
  removeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.sender) this.socketToSession.delete(session.sender);
      if (session.receiver) this.socketToSession.delete(session.receiver);
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Updates session last activity timestamp
   * @param {string} sessionId
   */
  touchSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  /**
   * Handles a socket disconnection
   * @param {string} socketId
   * @returns {{ sessionId: string, role: 'sender'|'receiver', partnerId: string | null } | null}
   */
  handleDisconnect(socketId) {
    const sessionId = this.socketToSession.get(socketId);
    if (!sessionId) return null;

    const session = this.sessions.get(sessionId);
    if (!session) {
      this.socketToSession.delete(socketId);
      return null;
    }

    let role = null;
    let partnerId = null;

    if (session.sender === socketId) {
      role = 'sender';
      partnerId = session.receiver;
    } else if (session.receiver === socketId) {
      role = 'receiver';
      partnerId = session.sender;
    }

    // Remove the session completely when either peer leaves
    this.removeSession(sessionId);

    return { sessionId, role, partnerId };
  }

  /**
   * Cleans up expired sessions and returns list of expired session IDs with their socket IDs
   * @returns {Array<{ sessionId: string, sender: string, receiver: string | null }>}
   */
  cleanExpiredSessions() {
    const now = Date.now();
    const expired = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        expired.push({
          sessionId,
          sender: session.sender,
          receiver: session.receiver
        });
        this.removeSession(sessionId);
      }
    }

    return expired;
  }
}

export const sessionManager = new SessionManager();
