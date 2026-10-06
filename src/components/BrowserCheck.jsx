import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export function BrowserCheck() {
  const [unsupported, setUnsupported] = useState(false);
  const [missingFeatures, setMissingFeatures] = useState([]);

  useEffect(() => {
    const missing = [];
    if (!window.RTCPeerConnection) {
      missing.push('WebRTC RTCPeerConnection');
    }
    if (!window.crypto || !window.crypto.subtle) {
      missing.push('Web Crypto API (crypto.subtle)');
    }

    if (missing.length > 0) {
      setUnsupported(true);
      setMissingFeatures(missing);
    }
  }, []);

  if (!unsupported) return null;

  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 m-4 rounded-r shadow-sm">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-amber-800 text-sm">Unsupported Browser Features</h3>
          <p className="text-amber-700 text-xs mt-1">
            Your browser does not support required P2P WebRTC features ({missingFeatures.join(', ')}).
          </p>
          <p className="text-amber-700 text-xs mt-1 font-semibold">
            Please use a recent version of Chrome, Edge, Firefox, or Safari for direct file transfers.
          </p>
        </div>
      </div>
    </div>
  );
}
