import React, { useState, useEffect, useRef } from 'react';
import { FileDropzone } from '../components/FileDropzone.jsx';
import { FileList } from '../components/FileList.jsx';
import { SessionCode } from '../components/SessionCode.jsx';
import { QRCodeDisplay } from '../components/QRCodeDisplay.jsx';
import { ConnectionStatus } from '../components/ConnectionStatus.jsx';
import { TransferProgress } from '../components/TransferProgress.jsx';
import { TransferComplete } from '../components/TransferComplete.jsx';
import { PrivacyBadge } from '../components/PrivacyBadge.jsx';

import { signalingService } from '../services/signaling.js';
import { WebRTCService } from '../services/webrtc.js';
import { FileTransferManager } from '../services/fileTransfer.js';
import { generateSessionKey } from '../services/encryption.js';

import { Lock, Send as SendIcon, ArrowLeft, Shield } from 'lucide-react';

export function Send({ initialFiles = [], onBackToHome, iceConfig }) {
  const [files, setFiles] = useState(initialFiles);
  const [useEncryption, setUseEncryption] = useState(true);
  
  // Connection states
  const [transferState, setTransferState] = useState('IDLE'); // IDLE, CREATING_SESSION, WAITING_FOR_PEER, CONNECTING, CONNECTED, WAITING_FOR_ACCEPT, TRANSFERRING, COMPLETED, DISCONNECTED, FAILED, EXPIRED, CANCELLED
  const [sessionId, setSessionId] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Progress metrics
  const [progressData, setProgressData] = useState(null);

  // References
  const webrtcRef = useRef(null);
  const fileManagerRef = useRef(null);
  const sessionKeyRef = useRef(null);
  const activeSessionIdRef = useRef('');

  useEffect(() => {
    return () => {
      cleanupConnection();
    };
  }, []);

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

  const handleFilesSelected = (newFiles) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  /**
   * Initiates Sender Session Creation & WebRTC Setup
   */
  const handleCreateSession = async () => {
    if (files.length === 0) return;

    setTransferState('CREATING_SESSION');
    setErrorMessage('');

    try {
      // 1. Generate Application-Level AES-GCM Key for signaling & payload encryption
      const { key, hexKey } = await generateSessionKey();
      sessionKeyRef.current = key;

      // Reset listeners and set session key
      signalingService.disconnect();
      signalingService.setSessionKey(key);

      // 2. Setup Signaling event listeners
      signalingService.connect();

      signalingService.on('session-created', async ({ sessionId: createdId }) => {
        activeSessionIdRef.current = createdId;
        setSessionId(createdId);
        
        // Construct Share URL with URL hash fragment (#key=...) so key is NEVER sent to server
        const url = `${window.location.origin}/#/share/${createdId}#key=${hexKey}`;
        setShareUrl(url);

        setTransferState('WAITING_FOR_PEER');
      });

      signalingService.on('peer-connected', async () => {
        setTransferState('CONNECTING');
        await startWebRTCHandshake(activeSessionIdRef.current);
      });

      signalingService.on('answer', async ({ answer }) => {
        if (webrtcRef.current) {
          await webrtcRef.current.setAnswer(answer);
        }
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

      // 3. Emit create-session to signaling server
      signalingService.createSession();

    } catch (err) {
      console.error('Failed to create sharing session:', err);
      setErrorMessage('Failed to initialize encryption or session.');
      setTransferState('FAILED');
    }
  };

  /**
   * Starts WebRTC Offer creation and DataChannel setup upon Receiver joining
   */
  const startWebRTCHandshake = async (sId) => {
    const webrtc = new WebRTCService(iceConfig);
    webrtcRef.current = webrtc;

    webrtc.on('ice-candidate', (candidate) => {
      signalingService.sendIceCandidate(sId, candidate);
    });

    webrtc.on('connection-state', (state) => {
      if (state === 'failed' || state === 'disconnected') {
        setTransferState('DISCONNECTED');
      }
    });

    webrtc.on('datachannel-open', () => {
      setTransferState('CONNECTED');
      initFileTransferEngine();
    });

    // Create DataChannel & Offer
    webrtc.createDataChannel();
    const offer = await webrtc.createOffer();
    await signalingService.sendOffer(sId, offer);
  };

  /**
   * Initializes File Transfer Manager and listens for progress & receiver signals
   */
  const initFileTransferEngine = () => {
    const manager = new FileTransferManager(webrtcRef.current);
    manager.setEncryption(useEncryption, sessionKeyRef.current);
    manager.setFiles(files);
    fileManagerRef.current = manager;

    manager.on('progress', (data) => {
      setProgressData(data);
      setTransferState('TRANSFERRING');
    });

    manager.on('transfer-completed', () => {
      setTransferState('COMPLETED');
    });

    manager.on('transfer-cancelled', () => {
      setTransferState('CANCELLED');
    });

    // Send manifest to receiver
    manager.sendManifest();
    setTransferState('WAITING_FOR_ACCEPT');

    // Automatically start sending when Receiver accepts manifest or DataChannel is active
    // Receiver sends file-accept message or manager ready
    webrtcRef.current.on('datachannel-message', (data) => {
      if (typeof data === 'string') {
        try {
          const msg = JSON.parse(data);
          if (msg.type === 'receiver-ready') {
            manager.startSending();
          }
        } catch (e) {}
      }
    });
  };

  const handleCancelTransfer = () => {
    if (fileManagerRef.current) {
      fileManagerRef.current.cancelTransfer('Sender cancelled the transfer.');
    }
    setTransferState('CANCELLED');
  };

  const handleReset = () => {
    cleanupConnection();
    setFiles([]);
    setTransferState('IDLE');
    setSessionId('');
    setShareUrl('');
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

      {/* STEP 1: IDLE / FILE SELECTION STATE */}
      {transferState === 'IDLE' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Select files to share
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Files are streamed directly from your device memory to the receiver.
            </p>

            <FileDropzone onFilesSelected={handleFilesSelected} />

            {files.length > 0 && (
              <>
                <FileList files={files} onRemoveFile={handleRemoveFile} />

                {/* Optional AES-GCM File Encryption Toggle */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between my-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-xs text-gray-900 block">
                        Application-Level AES-GCM File Encryption
                      </span>
                      <span className="text-[11px] text-gray-500 block">
                        Encrypts file chunks before transmission (in addition to WebRTC DTLS).
                      </span>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useEncryption}
                      onChange={(e) => setUseEncryption(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>

                <button
                  onClick={handleCreateSession}
                  className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 rounded-xl text-sm transition-colors flex items-center justify-center space-x-2 shadow-sm mt-4"
                >
                  <SendIcon className="w-4 h-4" />
                  <span>Create Sharing Session</span>
                </button>
              </>
            )}
          </div>

          <PrivacyBadge />
        </div>
      )}

      {/* STEP 2: SESSION CREATED / WAITING FOR RECEIVER */}
      {(transferState === 'WAITING_FOR_PEER' || transferState === 'CREATING_SESSION') && (
        <div className="space-y-4">
          {sessionId && (
            <>
              <SessionCode sessionId={sessionId} shareUrl={shareUrl} />
              <QRCodeDisplay shareUrl={shareUrl} />
              <FileList files={files} />
            </>
          )}
        </div>
      )}

      {/* STEP 3: CONNECTING & WAITING FOR ACCEPT */}
      {(transferState === 'CONNECTING' || transferState === 'CONNECTED' || transferState === 'WAITING_FOR_ACCEPT') && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900 text-base">Receiver Connected</h3>
          <p className="text-xs text-gray-500">
            Waiting for receiver to accept the file transfer request...
          </p>
          <FileList files={files} />
        </div>
      )}

      {/* STEP 4: TRANSFER IN PROGRESS */}
      {transferState === 'TRANSFERRING' && progressData && (
        <TransferProgress
          progressData={progressData}
          isSender={true}
          onCancel={handleCancelTransfer}
        />
      )}

      {/* STEP 5: COMPLETED */}
      {transferState === 'COMPLETED' && (
        <TransferComplete
          files={files}
          isSender={true}
          onReset={handleReset}
        />
      )}

      {/* STEP 6: DISCONNECTED / CANCELLED / EXPIRED / FAILED */}
      {['DISCONNECTED', 'CANCELLED', 'EXPIRED', 'FAILED'].includes(transferState) && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm my-4 space-y-4">
          <p className="text-sm font-medium text-gray-800">
            {transferState === 'CANCELLED' && 'Transfer was cancelled.'}
            {transferState === 'DISCONNECTED' && 'Connection lost. Receiver left or lost connection.'}
            {transferState === 'EXPIRED' && 'Session expired due to inactivity limit (15 mins).'}
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
