import React from 'react';
import { Shield, Lock, Cpu } from 'lucide-react';

export function PrivacyBadge() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-5 text-sm text-gray-700 my-6">
      <div className="flex items-center space-x-2 text-gray-900 font-semibold mb-2">
        <Shield className="w-5 h-5 text-emerald-600" />
        <span>Browser-to-Browser Direct Transfer</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-3 text-gray-600">
        <div className="flex items-start space-x-2 bg-white p-2.5 rounded-lg border border-gray-100">
          <Cpu className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="text-gray-800 block">No Server Storage</strong>
            Files never pass through or touch server disks.
          </div>
        </div>

        <div className="flex items-start space-x-2 bg-white p-2.5 rounded-lg border border-gray-100">
          <Lock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="text-gray-800 block">WebRTC & AES-256</strong>
            Encrypted end-to-end via WebRTC DTLS and Web Crypto.
          </div>
        </div>

        <div className="flex items-start space-x-2 bg-white p-2.5 rounded-lg border border-gray-100">
          <Shield className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="text-gray-800 block">Signaling Only</strong>
            Server only coordinates peer connection establishment.
          </div>
        </div>
      </div>
    </div>
  );
}
