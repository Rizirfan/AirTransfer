import React from 'react';
import { Loader2, Wifi, WifiOff, CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';

export function ConnectionStatus({ status, customMessage }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'CREATING_SESSION':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin text-gray-600" />,
          label: 'Creating sharing session...',
          badgeBg: 'bg-gray-100 text-gray-700 border-gray-200'
        };
      case 'WAITING_FOR_PEER':
        return {
          icon: <Clock className="w-4 h-4 animate-pulse text-amber-600" />,
          label: 'Waiting for receiver to join...',
          badgeBg: 'bg-amber-50 text-amber-700 border-amber-200'
        };
      case 'CONNECTING':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin text-blue-600" />,
          label: 'Establishing WebRTC peer connection...',
          badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
        };
      case 'CONNECTED':
        return {
          icon: <Wifi className="w-4 h-4 text-emerald-600" />,
          label: 'Connected • Peer ready',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      case 'WAITING_FOR_ACCEPT':
        return {
          icon: <Clock className="w-4 h-4 animate-pulse text-indigo-600" />,
          label: 'Waiting for receiver to accept transfer...',
          badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        };
      case 'TRANSFERRING':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin text-black" />,
          label: 'Transferring files directly...',
          badgeBg: 'bg-gray-100 text-gray-900 border-gray-300 font-semibold'
        };
      case 'COMPLETED':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          label: 'Transfer completed successfully',
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300'
        };
      case 'DISCONNECTED':
        return {
          icon: <WifiOff className="w-4 h-4 text-rose-600" />,
          label: 'Peer disconnected',
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200'
        };
      case 'CANCELLED':
        return {
          icon: <XCircle className="w-4 h-4 text-gray-600" />,
          label: 'Transfer cancelled',
          badgeBg: 'bg-gray-100 text-gray-700 border-gray-300'
        };
      case 'EXPIRED':
        return {
          icon: <Clock className="w-4 h-4 text-rose-600" />,
          label: 'Session expired (15 minute limit reached)',
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200'
        };
      case 'FAILED':
        return {
          icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
          label: customMessage || 'Connection failed',
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200'
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-xs font-medium my-3 shadow-xs ${config.badgeBg}`}>
      {config.icon}
      <span>{customMessage || config.label}</span>
    </div>
  );
}
