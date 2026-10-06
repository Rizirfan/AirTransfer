import React, { useState, useEffect, useRef } from 'react';
import { FileList } from '../components/FileList.jsx';
import { ConnectionStatus } from '../components/ConnectionStatus.jsx';
import { TransferProgress } from '../components/TransferProgress.jsx';
import { TransferComplete } from '../components/TransferComplete.jsx';
import { PrivacyBadge } from '../components/PrivacyBadge.jsx';

import { signalingService } from '../services/signaling.js';
import { WebRTCService } from '../services/webrtc.js';
import { FileTransferManager } from '../services/fileTransfer.js';
import { importKeyFromHex } from '../services/encryption.js';

import { Download, ArrowLeft, ShieldCheck, Check, X, Loader2 } from 'lucide-react';

export function Receive({ sessionId: initialSessionId, initialHexKey = '', onBackToHome, iceConfig }) {
  const [sessionId, setSessionId] = useState(initialSessionId || '');
  const [hexKey, setHexKey] = useState(initialHexKey || '');

  // Connection Lifecycle States
  const [transferState, setTransferState] = useState('IDLE'); // IDLE, CONNECTING, CONNECTED, WAITING_FOR_ACCEPT, TRANSFERRING, COMPLETED, DISCONNECTED, FAILED, EXPIRED, CANCELLED
  const [errorMessage, setErrorMessage] = useState('');

  // File manifest offered by Sender
  const [incomingManifest, setIncomingManifest] = useState([]);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [progressData, setProgressData] = useState(null);

  // References
  const webrtcRef = useRef(null);
  const fileManagerRef = useRef(null);
  const sessionKeyRef = useRef(null);
  const activeSessionIdRef = useRef('');

  useEffect(() => {
    if (initialSessionId) {
      setSessionId(initialSessionId);
      activeSessionIdRef.current = initialSessionId;
    }

    // Parse URL hash for key if present (e.g. #/share/K8F4-X92P#key=...)
    if (!initialHexKey) {
      const hash = window.location.hash;
      const match = hash.match(/key=([a-f0-9]+)/i);
      if (match) {
        setHexKey(match[1]);
      }
    }

    return () => {
      cleanupConnection();
    };
  }, [initialSessionId, initialHexKey]);

  const cleanupConnection = () => {
    if (fileManagerRef.current) {
      fileManagerRef.current.cancelTransfer('Cleanup');
      fileManagerRef.current = null;
    }
    if (webrtcRef.current) {
      webrtcRef.current.close();
      webrtcRef.current = null;
    }
    if (activeSessionIdRef.current) {
      signalingService.leaveSession(activeSessionIdRef.current);
    }
    signalingService.disconnect();
  };

  /**
   * Receiver clicks [ Connect ]
   */
  const handleConnect = async () => {
    if (!sessionId) return;
    const cleanSessionId = sessionId.trim().toUpperCase();
    activeSessionIdRef.current = cleanSessionId;

    setTransferState('CONNECTING');
    setErrorMessage('');

    try {
      // Disconnect previous socket listeners if any
      signalingService.disconnect();

      // Import session encryption key if present in URL hash
      if (hexKey) {
        const key = await importKeyFromHex(hexKey);
        sessionKeyRef.current = key;
        signalingService.setSessionKey(key);
      }

      signalingService.connect();

      signalingService.on('session-joined', async ({ sessionId: joinedId }) => {
        // Session joined successfully, wait for SDP Offer from Sender
      });

      signalingService.on('offer', async ({ offer }) => {
        await handleReceiveOffer(offer, cleanSessionId);
      });

      signalingService.on('ice-candidate', async ({ candidate }) => {
        if (webrtcRef.current) {
          await webrtcRef.current.addIceCandidate(candidate);
        }
      });

      signalingService.on('peer-disconnected', () => {
        setTransferState('DISCONNECTED');
      });

      signalingService.on('session-expired', () => {
        setTransferState('EXPIRED');
      });

      signalingService.on('error-message', ({ message }) => {
        setErrorMessage(message);
        setTransferState('FAILED');
      });

      // Join session on signaling server
      signalingService.joinSession(cleanSessionId);

    } catch (err) {
      console.error('Failed to connect to session:', err);
      setErrorMessage('Failed to initialize connection.');
      setTransferState('FAILED');
    }
  };

  /**
   * Processes SDP Offer from Sender and responds with SDP Answer
   */
  const handleReceiveOffer = async (offer, currentSessionId) => {
    const webrtc = new WebRTCService(iceConfig);
    webrtcRef.current = webrtc;

    webrtc.on('ice-candidate', (candidate) => {
      signalingService.sendIceCandidate(currentSessionId || activeSessionIdRef.current, candidate);
    });

    webrtc.on('connection-state', (state) => {
      if (state === 'failed' || state === 'disconnected') {
        setTransferState('DISCONNECTED');
      }
    });

    webrtc.on('datachannel-open', () => {
      setTransferState('CONNECTED');
      initFileTransferReceiver();
    });

    const answer = await webrtc.createAnswer(offer);
    await signalingService.sendAnswer(currentSessionId || activeSessionIdRef.current, answer);
  };

  /**
   * Binds File Transfer Manager for Receiver DataChannel messages
   */
  const initFileTransferReceiver = () => {
    const manager = new FileTransferManager(webrtcRef.current);
    if (sessionKeyRef.current) {
      manager.setEncryption(true, sessionKeyRef.current);
    }
    fileManagerRef.current = manager;

    manager.on('manifest-received', ({ files, encrypted }) => {
      setIncomingManifest(files);
      setTransferState('WAITING_FOR_ACCEPT');
    });

    manager.on('progress', (data) => {
      setProgressData(data);
      setTransferState('TRANSFERRING');
    });

    manager.on('file-completed', (fileItem) => {
      setReceivedFiles(prev => [...prev, fileItem]);
    });

    manager.on('transfer-completed', () => {
      setTransferState('COMPLETED');
    });

    manager.on('transfer-cancelled', ({ reason }) => {
      setErrorMessage(reason);
      setTransferState('CANCELLED');
    });
  };

  /**
   * Receiver accepts the file transfer request
   */
  const handleAcceptTransfer = () => {
    setTransferState('TRANSFERRING');
    if (webrtcRef.current) {
      webrtcRef.current.send(JSON.stringify({ type: 'receiver-ready' }));
    }
  };

  /**
   * Receiver rejects the transfer request
   */
  const handleRejectTransfer = () => {
    if (fileManagerRef.current) {
      fileManagerRef.current.cancelTransfer('Receiver rejected the transfer request.');
    }
    setTransferState('CANCELLED');
  };

  const handleReset = () => {
    cleanupConnection();
    setTransferState('IDLE');
    setIncomingManifest([]);
    setReceivedFiles([]);
    setProgressData(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <ConnectionStatus status={transferState} customMessage={errorMessage} />
      </div>

      {/* STEP 1: INITIAL / ENTER CODE / CONNECT VIEW */}
      {transferState === 'IDLE' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs text-center space-y-6">
          <div>
            <span className="text-xs uppercase font-mono tracking-widest text-gray-400 font-semibold block mb-1">
              Join Session
            </span>
            <h2 className="text-2xl font-bold text-gray-900">
              Someone wants to send you files
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Direct peer-to-peer browser connection. No files will be saved on server.
            </p>
          </div>

          <div className="max-w-xs mx-auto space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase font-mono mb-1 text-left">
                Session Code
              </label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value.toUpperCase())}
                placeholder="e.g. K8F4-X92P"
                maxLength={9}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-lg font-mono font-bold uppercase tracking-wider text-gray-900 text-center placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
              />
            </div>

            <button
              onClick={handleConnect}
              disabled={!sessionId}
              className="w-full bg-black hover:bg-gray-800 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors flex items-center justify-center space-x-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Connect & Receive</span>
            </button>
          </div>

          <PrivacyBadge />
        </div>
      )}

      {/* STEP 2: CONNECTING / WAITING FOR SENDER */}
      {transferState === 'CONNECTING' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-xs space-y-4">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-800" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">Connecting to Sender...</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Establishing WebRTC peer-to-peer data connection for Session {sessionId}.
          </p>
        </div>
      )}

      {/* STEP 3: MANIFEST OFFERED / ACCEPT OR REJECT */}
      {transferState === 'WAITING_FOR_ACCEPT' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="text-center">
            <span className="text-xs uppercase font-mono font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-block mb-2">
              Connected • Sender is ready
            </span>
            <h3 className="text-xl font-bold text-gray-900">
              Accept incoming file transfer?
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Sender has offered {incomingManifest.length} {incomingManifest.length === 1 ? 'file' : 'files'} for direct transfer.
            </p>
          </div>

          <FileList files={incomingManifest} />

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleRejectTransfer}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-medium transition-colors flex items-center space-x-1.5"
            >
              <X className="w-4 h-4" />
              <span>Reject</span>
            </button>

            <button
              onClick={handleAcceptTransfer}
              className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Accept Transfer</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: TRANSFER IN PROGRESS */}
      {transferState === 'TRANSFERRING' && progressData && (
        <TransferProgress
          progressData={progressData}
          isSender={false}
          onCancel={handleRejectTransfer}
        />
      )}

      {/* STEP 5: COMPLETED STATE */}
      {transferState === 'COMPLETED' && (
        <TransferComplete
          files={receivedFiles}
          isSender={false}
          onReset={handleReset}
        />
      )}

      {/* STEP 6: DISCONNECTED / CANCELLED / EXPIRED / FAILED */}
      {['DISCONNECTED', 'CANCELLED', 'EXPIRED', 'FAILED'].includes(transferState) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-xs my-4 space-y-4">
          <p className="text-sm font-medium text-gray-800">
            {transferState === 'CANCELLED' && (errorMessage || 'Transfer was cancelled.')}
            {transferState === 'DISCONNECTED' && 'Connection lost. Sender disconnected.'}
            {transferState === 'EXPIRED' && 'Session expired or not found.'}
            {transferState === 'FAILED' && (errorMessage || 'Connection failed.')}
          </p>

          <button
            onClick={handleReset}
            className="inline-flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <span>Try Again</span>
          </button>
        </div>
      )}

    </div>
  );
}
