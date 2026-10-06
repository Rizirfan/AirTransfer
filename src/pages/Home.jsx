import React, { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone.jsx';
import { PrivacyBadge } from '../components/PrivacyBadge.jsx';
import { ArrowRight, Download, ShieldCheck, Zap, Lock, Globe } from 'lucide-react';
import { isValidSessionId } from '../utils/sessionId.js';

export function Home({ onSelectFilesToSend, onJoinSession }) {
  const [joinCode, setJoinCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      setCodeError('Please enter a session code.');
      return;
    }

    if (!isValidSessionId(cleanCode)) {
      setCodeError('Invalid code format. Expected format: K8F4-X92P');
      return;
    }

    setCodeError('');
    onJoinSession(cleanCode);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center space-x-2 bg-gray-100 border border-gray-200 text-gray-800 text-xs px-3 py-1 rounded-full font-mono font-medium mb-4">
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>Zero-Knowledge Peer-to-Peer Transfer</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
          Direct browser-to-browser file sharing.
        </h1>
        <p className="text-gray-600 text-base sm:text-lg mt-4 leading-relaxed">
          Send large files directly to another device with end-to-end encryption.
          No cloud storage, no file limits, and no server middleman.
        </p>
      </div>

      {/* Main Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8">
        
        {/* Send Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:border-gray-300 transition-all">
          <div>
            <span className="text-xs uppercase font-mono tracking-widest text-gray-400 font-semibold block mb-1">
              Sender
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Send Files</h2>
            <p className="text-sm text-gray-500 mb-6">
              Select or drop files to generate a secure share code and QR.
            </p>
          </div>

          <FileDropzone onFilesSelected={onSelectFilesToSend} />
        </div>

        {/* Receive Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:border-gray-300 transition-all">
          <div>
            <span className="text-xs uppercase font-mono tracking-widest text-gray-400 font-semibold block mb-1">
              Receiver
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Receive Files</h2>
            <p className="text-sm text-gray-500 mb-6">
              Enter the 8-character session code provided by the sender.
            </p>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase font-mono mb-1.5">
                  Share Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    setCodeError('');
                  }}
                  placeholder="e.g. K8F4-X92P"
                  maxLength={9}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-lg font-mono font-bold uppercase tracking-wider text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                />
                {codeError && (
                  <p className="text-xs text-rose-600 mt-1.5 font-medium">{codeError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 rounded-xl text-sm transition-colors flex items-center justify-center space-x-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Join Session & Receive</span>
              </button>
            </form>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <p className="flex items-center space-x-1.5">
              <Globe className="w-4 h-4 text-gray-400" />
              <span>Works across all modern desktop & mobile browsers.</span>
            </p>
          </div>
        </div>

      </div>

      {/* Privacy Guarantee Banner */}
      <PrivacyBadge />

      {/* How it works section */}
      <div className="mt-12 text-center border-t border-gray-200 pt-10">
        <h3 className="text-sm uppercase font-mono font-bold text-gray-400 tracking-wider mb-6">
          How P2P DataChannel Works
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="w-7 h-7 bg-black text-white font-mono font-bold text-xs rounded-full flex items-center justify-center mb-3">
              1
            </div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">Create Session</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Sender creates a session code. Encryption keys are generated locally inside the browser.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="w-7 h-7 bg-black text-white font-mono font-bold text-xs rounded-full flex items-center justify-center mb-3">
              2
            </div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">WebRTC Handshake</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Signaling server relays encrypted connection tokens, establishing a direct browser-to-browser tunnel.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="w-7 h-7 bg-black text-white font-mono font-bold text-xs rounded-full flex items-center justify-center mb-3">
              3
            </div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">Direct Transfer</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Files are split into 64KB chunks and streamed straight into receiver memory with backpressure control.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
