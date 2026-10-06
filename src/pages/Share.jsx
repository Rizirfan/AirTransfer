import React from 'react';
import { Receive } from './Receive.jsx';

export function Share({ sessionId, onBackToHome, iceConfig }) {
  // Extract key from hash fragment (#key=...) if available
  const hash = window.location.hash;
  const match = hash.match(/key=([a-f0-9]+)/i);
  const hexKey = match ? match[1] : '';

  return (
    <Receive
      initialSessionId={sessionId}
      initialHexKey={hexKey}
      onBackToHome={onBackToHome}
      iceConfig={iceConfig}
    />
  );
}
