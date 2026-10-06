import React, { useState } from 'react';
import { Copy, Check, Link as LinkIcon } from 'lucide-react';

export function SessionCode({ sessionId, shareUrl }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm my-4">
      <span className="text-xs uppercase font-mono tracking-wider text-gray-500 font-semibold block mb-2">
        Share Session Code
      </span>

      {/* Large Session Code Box */}
      <div className="inline-block bg-gray-50 border border-gray-200 px-6 py-3 rounded-lg my-2">
        <span className="text-2xl sm:text-3xl font-mono font-bold tracking-wider text-gray-900 select-all">
          {sessionId}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
        <button
          onClick={() => copyToClipboard(sessionId, 'code')}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-colors"
        >
          {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          <span>{copiedCode ? 'Code Copied!' : 'Copy Code'}</span>
        </button>

        <button
          onClick={() => copyToClipboard(shareUrl, 'link')}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg text-xs font-medium transition-colors"
        >
          {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <LinkIcon className="w-4 h-4" />}
          <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
        </button>
      </div>

      <p className="text-[11px] text-gray-400 mt-4">
        Receiver opens this link or enters the 8-character code to join the transfer.
      </p>
    </div>
  );
}
