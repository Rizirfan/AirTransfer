import { sessionManager } from './sessionManager.js';
import { generateSessionId, isValidSessionId } from '../utils/sessionId.js';
import { checkSocketRateLimit } from '../middleware/rateLimit.js';

/**
 * Initializes Socket.IO signaling event handlers
 * @param {import('socket.io').Server} io
 * @param {number} expiryMinutes
 */
export function setupSignalingHandler(io, expiryMinutes = 15) {
  // Interval to sweep expired sessions every 30 seconds
  setInterval(() => {
    const expiredSessions = sessionManager.cleanExpiredSessions();
    for (const exp of expiredSessions) {
      if (exp.sender) {
        io.to(exp.sender).emit('session-expired', { sessionId: exp.sessionId });
      }
      if (exp.receiver) {
        io.to(exp.receiver).emit('session-expired', { sessionId: exp.sessionId });
      }
    }
  }, 30 * 1000);

  io.on('connection', (socket) => {
    const clientIp = socket.handshake.address;

    // Rate limiting check
    if (!checkSocketRateLimit(clientIp)) {
      socket.emit('error-message', { message: 'Too many signaling requests. Please wait a moment.' });
      socket.disconnect(true);
      return;
    }

    /**
     * Sender creates a new sharing session
     */
    socket.on('create-session', () => {
      const sessionId = generateSessionId();
      const session = sessionManager.createSession(sessionId, socket.id, expiryMinutes);

      socket.join(sessionId);
      socket.emit('session-created', {
        sessionId: session.sessionId,
        expiresAt: session.expiresAt
      });
    });

    /**
     * Receiver joins a session using session ID
     */
    socket.on('join-session', ({ sessionId }) => {
      if (!sessionId || !isValidSessionId(sessionId)) {
        socket.emit('error-message', { message: 'Invalid session code format.' });
        return;
      }

      const cleanSessionId = sessionId.trim().toUpperCase();
      const result = sessionManager.joinSession(cleanSessionId, socket.id);

      if (!result.success) {
        socket.emit('error-message', { message: result.reason });
        return;
      }

      const session = result.session;
      socket.join(cleanSessionId);

      // Notify Receiver that join succeeded
      socket.emit('session-joined', {
        sessionId: cleanSessionId,
        senderId: session.sender
      });

      // Notify Sender that Receiver has joined and is ready for WebRTC offer
      io.to(session.sender).emit('peer-connected', {
        receiverId: socket.id
      });
    });

    /**
     * Relay SDP Offer from Sender to Receiver
     * Payload contains encrypted signaling envelope or SDP offer object
     */
    socket.on('offer', ({ sessionId, offer, payload }) => {
      const session = sessionManager.getSession(sessionId);
      if (!session) {
        socket.emit('error-message', { message: 'Session expired or not found.' });
        return;
      }

      sessionManager.touchSession(sessionId);

      if (session.receiver) {
        io.to(session.receiver).emit('offer', {
          senderId: socket.id,
          offer,
          payload
        });
      }
    });

    /**
     * Relay SDP Answer from Receiver to Sender
     */
    socket.on('answer', ({ sessionId, answer, payload }) => {
      const session = sessionManager.getSession(sessionId);
      if (!session) {
        socket.emit('error-message', { message: 'Session expired or not found.' });
        return;
      }

      sessionManager.touchSession(sessionId);

      if (session.sender) {
        io.to(session.sender).emit('answer', {
          receiverId: socket.id,
          answer,
          payload
        });
      }
    });

    /**
     * Relay ICE Candidates between peers
     */
    socket.on('ice-candidate', ({ sessionId, candidate, payload }) => {
      const session = sessionManager.getSession(sessionId);
      if (!session) return;

      sessionManager.touchSession(sessionId);

      // Target the opposite peer
      const targetSocketId = socket.id === session.sender ? session.receiver : session.sender;
      if (targetSocketId) {
        io.to(targetSocketId).emit('ice-candidate', {
          from: socket.id,
          candidate,
          payload
        });
      }
    });

    /**
     * Handle explicit peer disconnect or leave action
     */
    socket.on('leave-session', ({ sessionId }) => {
      const sessionData = sessionManager.handleDisconnect(socket.id);
      if (sessionData && sessionData.partnerId) {
        io.to(sessionData.partnerId).emit('peer-disconnected', {
          reason: 'Peer left the session.'
        });
      }
      socket.leave(sessionId);
    });

    /**
     * Handle socket disconnect event
     */
    socket.on('disconnect', () => {
      const sessionData = sessionManager.handleDisconnect(socket.id);
      if (sessionData && sessionData.partnerId) {
        io.to(sessionData.partnerId).emit('peer-disconnected', {
          reason: 'Peer disconnected.'
        });
      }
    });
  });
}
