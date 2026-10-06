import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { X, Camera, SwitchCamera, AlertCircle } from 'lucide-react';
import { isValidSessionId } from '../utils/sessionId.js';

export function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [error, setError] = useState('');
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    // Give DOM time to render reader div
    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    setError('');
    try {
      const html5Qrcode = new Html5Qrcode('qr-reader-target');
      scannerRef.current = html5Qrcode;

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      await html5Qrcode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleDecodedText(decodedText);
        },
        (errorMessage) => {
          // Silent scan frame failure
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.error('Failed to start QR camera scanner:', err);
      setError('Could not access camera. Please allow camera permissions or use manual code entry.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleDecodedText = async (text) => {
    await stopScanner();

    // Check if scanned text is a full AirTransfer URL (e.g. https://domain.com/#/share/K8F4-X92P#key=123)
    if (text.includes('#/share/')) {
      const parts = text.split('#/share/')[1];
      const sessionId = parts.split('/')[0].split('#')[0].toUpperCase();
      const matchKey = text.match(/key=([a-f0-9]+)/i);
      const hexKey = matchKey ? matchKey[1] : '';

      onScanSuccess({ sessionId, fullUrl: text, hexKey });
      onClose();
      return;
    }

    // Check if scanned text is directly an 8-character session code (e.g. K8F4-X92P)
    const cleanText = text.trim().toUpperCase();
    if (isValidSessionId(cleanText)) {
      onScanSuccess({ sessionId: cleanText });
      onClose();
      return;
    }

    setError(`Scanned QR code ("${text.slice(0, 30)}...") is not a valid AirTransfer share code.`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 relative shadow-2xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-gray-900 font-bold">
            <Camera className="w-5 h-5 text-black" />
            <span>Scan QR Code to Receive</span>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Container */}
        <div className="relative bg-gray-900 rounded-xl overflow-hidden min-h-[260px] flex items-center justify-center text-white">
          <div id="qr-reader-target" className="w-full h-full text-black"></div>

          {!isScanning && !error && (
            <p className="text-xs text-gray-400 font-mono">Initializing camera...</p>
          )}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg mt-3 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-[11px] text-gray-500 text-center mt-4">
          Point camera at the QR code displayed on the sender's screen.
        </p>
      </div>
    </div>
  );
}
