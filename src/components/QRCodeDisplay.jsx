import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode } from 'lucide-react';

export function QRCodeDisplay({ shareUrl }) {
  if (!shareUrl) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm my-4 flex flex-col items-center">
      <div className="flex items-center space-x-2 text-gray-700 font-medium text-sm mb-4">
        <QrCode className="w-4 h-4 text-gray-900" />
        <span>Scan to Receive Files</span>
      </div>

      <div className="bg-white p-3 border border-gray-200 rounded-xl shadow-inner inline-block">
        <QRCodeSVG
          value={shareUrl}
          size={160}
          level="H"
          includeMargin={true}
        />
      </div>

      <p className="text-xs text-gray-500 mt-3 max-w-xs">
        Point phone camera at QR code to open receiver page directly.
      </p>
    </div>
  );
}
