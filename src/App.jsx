import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.jsx';
import { BrowserCheck } from './components/BrowserCheck.jsx';

import { Home } from './pages/Home.jsx';
import { Send } from './pages/Send.jsx';
import { Receive } from './pages/Receive.jsx';
import { Share } from './pages/Share.jsx';

export function App() {
  const [currentRoute, setCurrentRoute] = useState({ page: 'home', params: {} });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [iceConfig, setIceConfig] = useState({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  // Fetch STUN/TURN configuration dynamically from backend API
  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SIGNALING_SERVER_URL || '';
    fetch(`${serverUrl}/api/config`)
      .then(res => res.json())
      .then(data => {
        if (data && data.iceServers) {
          setIceConfig({ iceServers: data.iceServers });
        }
      })
      .catch(err => {
        console.warn('Using default fallback STUN server config:', err);
      });
  }, []);

  // Hash-based routing handler for single-page experience
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash; // e.g. "#/share/K8F4-X92P#key=123"

      if (hash.startsWith('#/share/')) {
        const parts = hash.split('#/share/')[1].split('#')[0];
        const sessionId = parts.split('/')[0];
        setCurrentRoute({ page: 'share', params: { sessionId } });
      } else if (hash === '#/send') {
        setCurrentRoute({ page: 'send', params: {} });
      } else if (hash === '#/receive') {
        setCurrentRoute({ page: 'receive', params: {} });
      } else {
        setCurrentRoute({ page: 'home', params: {} });
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page, params = {}) => {
    if (page === 'home') {
      window.location.hash = '#/';
    } else if (page === 'send') {
      window.location.hash = '#/send';
    } else if (page === 'receive') {
      window.location.hash = '#/receive';
    } else if (page === 'share' && params.sessionId) {
      window.location.hash = `#/share/${params.sessionId}`;
    }
  };

  const handleSelectFilesFromHome = (files) => {
    setSelectedFiles(files);
    navigateTo('send');
  };

  const handleJoinFromHome = (sessionId) => {
    navigateTo('share', { sessionId });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 antialiased selection:bg-black selection:text-white">
      {/* Top Header */}
      <Header currentView={currentRoute.page} navigateTo={navigateTo} />

      {/* Browser Compatibility Check Alert */}
      <div className="max-w-5xl mx-auto w-full">
        <BrowserCheck />
      </div>

      {/* Main Page View */}
      <main className="flex-1">
        {currentRoute.page === 'home' && (
          <Home
            onSelectFilesToSend={handleSelectFilesFromHome}
            onJoinSession={handleJoinFromHome}
          />
        )}

        {currentRoute.page === 'send' && (
          <Send
            initialFiles={selectedFiles}
            onBackToHome={() => navigateTo('home')}
            iceConfig={iceConfig}
          />
        )}

        {currentRoute.page === 'receive' && (
          <Receive
            onBackToHome={() => navigateTo('home')}
            iceConfig={iceConfig}
          />
        )}

        {currentRoute.page === 'share' && (
          <Share
            sessionId={currentRoute.params.sessionId}
            onBackToHome={() => navigateTo('home')}
            iceConfig={iceConfig}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© AirTransfer • Production-Grade P2P Direct File Sharing</p>
          <p className="font-mono text-[11px] text-gray-400">
            WebRTC DataChannel • Web Crypto AES-256-GCM • Zero Server Storage
          </p>
        </div>
      </footer>
    </div>
  );
}
