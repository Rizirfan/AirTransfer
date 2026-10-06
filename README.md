# AirTransfer - One-to-One P2P File Sharing

AirTransfer is a production-grade, zero-knowledge, **one-to-one browser-to-browser file-sharing application** built with React, Vite, Node.js, WebRTC DataChannels, and the Web Crypto API.

---

## 1. Core Architecture & Privacy Model

The application enforces strict direct peer-to-peer file transfer:

```text
Browser A
   │
   │ WebRTC DataChannel (64KB Chunks + Backpressure)
   │
   │ Encrypted P2P File Transfer (DTLS + AES-256-GCM)
   ▼
Browser B

        ▲
        │
        │ Signaling Only (SDP Offer/Answer & ICE Candidates)
        ▼

Signaling Server (Node.js + Socket.IO)
  - In-Memory Session Management (No DB)
  - Max 2 participants per session
  - Session auto-expiry (15 mins)
  - NEVER receives or stores files
```

### Key Architectural Rules

1. **Zero Server File Storage**: The signaling server only relays encrypted connection tokens (SDP & ICE candidates). File bytes never touch the server disk, memory, or network socket.
2. **URL Hash Encryption Keys**: AES-256-GCM encryption keys are stored in the URL hash fragment (`/#/share/K8F4-X92P#key=...`). Browsers never transmit hash fragments to HTTP/WebSockets servers.
3. **DataChannel Backpressure**: Files are split into 64 KB chunks. Chunks are buffered safely using `RTCPeerConnection.bufferedAmount` to prevent memory overflows on large files.
4. **Strict Session Access**: Each sharing session allows a maximum of 2 participants (1 Sender + 1 Receiver). Third peers attempting to join are rejected with `"This session already has two participants."`.

---

## 2. Technology Stack

- **Frontend**: React 18, Vite, Lucide Icons, QRCode.react, Tailwind CSS
- **Networking & Crypto**: WebRTC `RTCPeerConnection`, `RTCDataChannel`, Web Crypto API (`crypto.subtle` AES-256-GCM)
- **Backend**: Node.js, Express, Socket.IO, Express Rate Limit
- **Storage**: In-memory `Map<sessionId, session>` (No database, no cloud storage)

---

## 3. Quick Start & Local Development

### Prerequisites

- Node.js `v18.0.0` or higher
- npm `v9.0.0` or higher

### Installation

```bash
# Clone or navigate to the project directory
npm install
```

### Running Locally

To start both the Node.js signaling server (Port `3050`) and the Vite development server (Port `5180`) concurrently:

```bash
npm run dev
```

Open your browser at `http://localhost:5180`.

## 4. Deploying to Production

### Step A: Deploy Signaling Server (Render / Railway)

Because WebRTC signaling uses persistent WebSockets (`Socket.IO`), host the signaling server on a Node.js process platform such as **Render** or **Railway**:

1. Create a free account on [Render.com](https://render.com).
2. Click **New +** -> **Web Service** and connect your GitHub repository.
3. Set the following build options:
   - **Root Directory**: `.` (leave default)
   - **Build Command**: `npm install`
   - **Start Command**: `node server/server.js`
4. Add Environment Variables:
   - `SESSION_EXPIRY_MINUTES`: `15`
   - `STUN_SERVER_URL`: `stun:stun.l.google.com:19302`
5. Click **Deploy Web Service** and copy your server URL (e.g. `https://p2p-signaling-server.onrender.com`).

---

### Step B: Deploy Frontend (Vercel)

1. Import your repository into [Vercel.com](https://vercel.com).
2. Under **Environment Variables**, add:
   - `VITE_SIGNALING_SERVER_URL`: `https://p2p-signaling-server.onrender.com` (your Render URL from Step A)
3. Click **Deploy**. Vercel will automatically build the Vite SPA using [vercel.json](file:///d:/my%20projects/shdesignmeld%20projects/projects/open/webapps/New%20folder/vercel.json).

---

## 5. Environment Configuration

Copy `.env.example` to `.env`:

```env
PORT=3050

STUN_SERVER_URL=stun:stun.l.google.com:19302

TURN_SERVER_URL=
TURN_USERNAME=
TURN_PASSWORD=

SESSION_EXPIRY_MINUTES=15

MAX_FILE_SIZE_MB=2048
```

---

## 5. Comprehensive Testing Checklist

Follow this checklist to verify all application workflows:

| # | Test Scenario | Steps / Expected Behavior | Status |
|---|---------------|---------------------------|--------|
| **1** | **Same computer, two tabs** | Open tab A (Send) and tab B (Receive). Copy share link. Verify WebRTC connects and file transfers cleanly. | [ ] |
| **2** | **Two computers on same Wi-Fi** | Open sender on Device 1, receiver link on Device 2. Verify STUN candidate exchange and transfer. | [ ] |
| **3** | **Computer to phone** | Scan QR code on mobile camera. Verify responsive layout and direct download on mobile browser. | [ ] |
| **4** | **Small image transfer** | Send a 2 MB PNG file. Verify instant transfer and inline file preview/download. | [ ] |
| **5** | **Large video transfer** | Send a > 500 MB MP4/MKV video file. Monitor smooth backpressure and live MB/s speed meter. | [ ] |
| **6** | **Multiple files** | Select 4 files simultaneously. Verify files transfer sequentially and progress bar updates accurately. | [ ] |
| **7** | **Cancel transfer (Sender)** | Click "Cancel" mid-transfer on sender side. Verify receiver receives `transfer-cancelled` message. | [ ] |
| **8** | **Reject transfer (Receiver)** | Sender offers files. Receiver clicks "Reject". Verify session closes gracefully. | [ ] |
| **9** | **Refresh receiver** | Refresh receiver tab during active connection. Verify sender receives disconnect notice. | [ ] |
| **10**| **Session expiration** | Create session and wait 15 minutes. Verify server purges session and notifies clients. | [ ] |
| **11**| **Network disconnect** | Toggle Wi-Fi off mid-transfer. Verify "Connection lost" error banner appears. | [ ] |
| **12**| **Unsupported browser** | Test in browser without WebRTC support. Verify human-readable warning banner. | [ ] |
| **13**| **Invalid session ID** | Enter `XXXX-YYYY` invalid session code. Verify "Session not found or expired" alert. | [ ] |
| **14**| **Third user join attempt** | Connect Tab A and Tab B. Open Tab C with same code. Verify "This session already has two participants." | [ ] |

---

## 6. Project Structure

```text
├── server/
│   ├── server.js               # Express & Socket.IO server entry
│   ├── signaling/
│   │   ├── sessionManager.js   # In-memory Map session manager
│   │   └── signalingHandler.js # Socket.IO event handlers
│   ├── middleware/
│   │   └── rateLimit.js        # Rate limiting middleware
│   └── utils/
│       └── sessionId.js        # Session ID generator & validator
│
├── src/
│   ├── components/
│   │   ├── FileDropzone.jsx    # Drag-and-drop file selector
│   │   ├── FileList.jsx        # File item display & icons
│   │   ├── TransferProgress.jsx# Progress bar, speed & ETA meter
│   │   ├── SessionCode.jsx     # Share code & copy buttons
│   │   ├── QRCodeDisplay.jsx   # Mobile QR code generator
│   │   ├── ConnectionStatus.jsx# WebRTC lifecycle state badge
│   │   ├── TransferComplete.jsx# Completion view & download triggers
│   │   ├── BrowserCheck.jsx    # WebRTC & WebCrypto capability check
│   │   ├── PrivacyBadge.jsx    # Zero-knowledge privacy guarantees
│   │   └── Header.jsx          # Header navigation
│   │
│   ├── pages/
│   │   ├── Home.jsx            # Landing page
│   │   ├── Send.jsx            # Sender workflow manager
│   │   ├── Receive.jsx         # Receiver workflow manager
│   │   └── Share.jsx           # Direct URL share router
│   │
│   ├── services/
│   │   ├── signaling.js        # Socket.IO client signaling wrapper
│   │   ├── webrtc.js           # RTCPeerConnection & DataChannel wrapper
│   │   ├── fileTransfer.js     # Chunking engine & backpressure manager
│   │   └── encryption.js       # AES-256-GCM Web Crypto API wrapper
│   │
│   ├── utils/
│   │   ├── chunking.js         # Binary 64KB packet header packing
│   │   ├── formatBytes.js      # Byte size formatter
│   │   └── formatSpeed.js      # Speed (MB/s) and ETA calculator
│   │
│   ├── App.jsx                 # Hash routing & STUN config loader
│   ├── main.jsx                # React DOM entry
│   └── index.css               # Global styles & Tailwind imports
│
├── index.html                  # HTML template
├── vite.config.js              # Vite server & proxy configuration
├── package.json                # Dependencies and scripts
└── .env.example                # Sample environment variables
```
