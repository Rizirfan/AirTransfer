import React from 'react';
import { ShieldCheck, ArrowRightLeft, Send, Download } from 'lucide-react';

export function Header({ currentView, navigateTo }) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand Name */}
          <div 
            onClick={() => navigateTo('home')}
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-black text-white rounded-lg flex items-center justify-center font-bold text-lg tracking-tight group-hover:bg-gray-800 transition-colors">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-lg text-gray-900 tracking-tight block leading-none">
                AirTransfer
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-gray-500 font-medium">
                P2P Encrypted
              </span>
            </div>
          </div>

          {/* Direct Navigation Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateTo('send')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                currentView === 'send'
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>

            <button
              onClick={() => navigateTo('receive')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                currentView === 'receive'
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Receive</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
