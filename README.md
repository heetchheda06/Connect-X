# ConnectX – Real-Time Chat Platform 🌊

> A modern, calm, and inviting real-time chat application designed with a fresh ocean aesthetic. Built with React 18, Vite, Tailwind CSS, Node.js, Express, MongoDB, and Socket.IO.

---

## 🌟 Overview & Aesthetic

ConnectX is crafted from the ground up to feel distinct from standard messaging clones. It combines an inviting, calm ocean color palette (cyan, teal, deep navy, and warm coral accents) with layered depth, generous rounded surfaces, smooth micro-interactions, and real-time responsiveness.

### Design System Principles
- **Atmosphere:** Clean, sunny ocean vibe with soft aqua backgrounds (`#F2FAFC`), subtle layered drop-shadows, and glowing gradient bubbles.
- **Light Mode First:** Built with clean semantic tokens mapped to CSS variables (`--bg-app`, `--bg-surface`, `--brand-500`, `--accent-coral`), ready for future theme expansion.
- **Typography:** **Plus Jakarta Sans** for crisp headings and **Inter** for comfortable body readability.
- **Signature Bubble Styling:** Sent messages render on a brand ocean gradient with high-contrast status ticks; received messages sit in crisp white rounded cards with subtle borders.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Zustand |
| **Icons & UI** | Lucide React, `emoji-picker-react` (code-split chunk), `react-hot-toast` |
| **Backend** | Node.js (ES Modules), Express.js |
| **Realtime** | Socket.IO (handshake JWT auth, room broadcast, multi-socket presence) |
| **Database** | MongoDB with Mongoose (compound indexes, directKey deduplication) |
| **Auth & Security** | JWT (7-day bearer tokens), bcryptjs (salt 12), Helmet, Mongo Sanitize |
| **File Storage** | Multer local storage (`/uploads`), abstracted behind a storage service layer |
| **Date & Time** | `date-fns` for time grouping and 12-hour timestamps |

---

## 🚀 Key Features

### 1. Authentication & User Profiles
- **Split Hero Auth View:** Animated floating ocean bubbles, feature badges, and switchable Login/Register tabs.
- **Secure Persistence:** 7-day JWT tokens stored securely on the client with Axios interceptors and auto-logout on expiration.
- **Custom Profiles:** Avatar uploads, auto-generated SVG initials with gradient backgrounds, bios, and custom status chips ("Crafting calm interfaces 🌊").
- **Case-Insensitive Search:** Debounced user discovery by name or `@username`, excluding self.

### 2. One-to-One & Direct Messaging
- **Zero-Duplicate Deterministic Keys:** Database-level compound `directKey` ensures concurrent clicks never produce duplicate conversation records.
- **Infinite Scroll Upward:** 30 messages per page with scroll position preservation when older history loads.
- **Sticky Date Dividers:** Automatically groups messages into "Today", "Yesterday", and formatted calendar dates.
- **Quoted Message Replies:** Click reply to quote any message with an interactive preview card in the composer.

### 3. Groups, Public Rooms & Discovery
- **Public Room Discovery:** Browse and search open public rooms with live member counts and one-click join.
- **Private Squad Groups:** Multi-step creation flow (select members, set name & description).
- **Channel Administration:** Admins can promote members to admin, remove members, or rename channels.
- **Member Self-Management:** Members can leave groups (creators transfer ownership or leave when other admins exist).

### 4. Real-Time Socket.IO Synchronization
- **Handshake Authentication:** Validates JWT during socket connection handshake.
- **Presence Engine:** Multi-tab/device tracking per user. Users show active with an online green dot and only transition offline when their last connection disconnects.
- **Typing Indicators:** Broadcasts live ("Riya is typing…" with animated wave dots, auto-clears after 3 seconds).
- **Live Event Sync:** Real-time message delivery, deletion propagation, and read receipts across all connected participants.
- **Auto-Reconnection Banner:** Unobtrusive banner appears if socket connectivity is briefly interrupted.

### 5. Read Receipts & Ticks
- **Sent Message Bubble Ticks:**
  - **Sent:** Single faded white tick (60% opacity)
  - **Delivered:** Double faded white ticks (60% opacity)
  - **Read:** Double solid white ticks with a soft mint glow (`#A7F3D0`)
- **Conversation List Previews:** Muted grey ticks for sent/delivered; primary brand teal ticks for read messages.
- **New Messages Divider:** Highlights the boundary above the first unread incoming message.
- **Message Info Modal:** Group messages display a "Read by" inspection dialog showing which members read the message and their exact timestamps.

### 6. File Attachments & Lightbox
- **Images:** JPG, PNG, WebP, GIF with inline previews and a click-to-fullscreen lightbox with keyboard Esc support.
- **Documents:** PDF, Word, Excel, PowerPoint, Text, and ZIP files rendered as clean file cards with size badges and direct download buttons.
- **Composer Enhancements:** Drag-and-drop dropzone, clipboard paste support, and real-time upload progress indicators (up to 10 MB per file).

### 7. Message Deletion
- **Delete for Me:** Instantly hides the message locally for the user.
- **Delete for Everyone:** Available to the sender within 1 hour; live-syncs a "🚫 This message was deleted" placeholder across all active sockets.

---

## 💻 Quickstart (Local Development)

### Prerequisites
- Node.js 18+ (tested on Node v20/v22)
- MongoDB instance running locally at `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-username/ConnectX.git
cd ConnectX

# Install all dependencies (root, backend, and frontend)
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Environment Variables
A `.env` file is located at the project root (and loaded by the server):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/connectx
JWT_SECRET=connectx_super_secret_jwt_key_development_2026_change_in_production
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
MAX_FILE_SIZE_MB=10
UPLOAD_DIR=uploads
```

### 3. Seed Database with Demo Accounts
Run the seed script from the root:
```bash
npm run seed
```

This populates 6 demo users, direct conversations, sample attachments, a public room, and a private group:
| Name | Username | Email | Password |
|---|---|---|---|
| **Aman Verma** | `@aman_v` | `aman@example.com` | `Password123!` |
| **Riya Sen** | `@riya_s` | `riya@example.com` | `Password123!` |
| **Priya Sharma** | `@priya_sharma` | `priya@example.com` | `Password123!` |
| **Rohan Mehta** | `@rohan_m` | `rohan@example.com` | `Password123!` |
| **Ananya Iyer** | `@ananya_i` | `ananya@example.com` | `Password123!` |
| **Kabir Joshi** | `@kabir_j` | `kabir@example.com` | `Password123!` |

### 4. Run Development Servers
Start both the backend API (port 5000) and the Vite frontend (port 5173) simultaneously:
```bash
npm run dev
```

Visit **http://localhost:5173** in your browser!

---

## 📁 Project Architecture

```
ConnectX/
├── .env                          # Root environment configuration
├── package.json                  # Root runner (concurrently scripts)
├── README.md                     # Documentation
│
├── server/                       # Express + Socket.IO Backend
│   ├── uploads/                  # Local media uploads directory
│   ├── src/
│   │   ├── server.js             # HTTP server & Socket.IO initialization
│   │   ├── config/               # Database and environment configs
│   │   ├── controllers/          # Auth, user, conversation, message controllers
│   │   ├── middleware/           # JWT auth, error handler, multer upload middleware
│   │   ├── models/               # User, Conversation, Message Mongoose schemas
│   │   ├── routes/               # Express REST routers (/api/auth, /api/users, etc.)
│   │   ├── services/             # Storage service & multi-socket presence service
│   │   ├── sockets/              # Socket.IO connection & event handlers
│   │   └── utils/
│   │       └── seed.js           # Database seeding script
│
└── client/                       # React 18 + Vite Frontend
    ├── src/
    │   ├── api/                  # Axios HTTP client with auth interceptors
    │   ├── components/
    │   │   ├── auth/             # Split hero auth panel & form components
    │   │   ├── chat/             # MessageList, MessageBubble, Composer, Header, InfoDrawer
    │   │   ├── layout/           # IconRail, MobileTabBar, ReconnectingBanner
    │   │   ├── modals/           # CreateGroup, DiscoverRooms, DeleteMessage, MessageInfo
    │   │   ├── sidebar/          # Sidebar conversation items, search & filter chips
    │   │   └── ui/               # Avatar, Lightbox, Badges
    │   ├── hooks/                # useSocket, useDebounce custom hooks
    │   ├── pages/                # AuthPage, ChatPage
    │   ├── store/                # Zustand stores (authStore, chatStore, socketStore)
    │   └── utils/                # Date formatting and avatar helpers
    ├── tailwind.config.js        # Design tokens and theme mappings
    └── vite.config.js            # Vite build configuration & proxy
```

---

## 🚢 Deployment Guide

### Deploy Backend (Render, Railway, or VPS)
1. Push your repository to GitHub.
2. In your cloud provider (e.g. [Render](https://render.com) or [Railway](https://railway.app)):
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
   - **Environment Variables:**
     - `MONGODB_URI`: Your MongoDB Atlas connection string
     - `JWT_SECRET`: A secure random 64-character string
     - `CLIENT_URL`: URL of your deployed frontend (e.g., `https://connectx.vercel.app`)
     - `NODE_ENV`: `production`

### Deploy Frontend (Vercel or Netlify)
1. In [Vercel](https://vercel.com):
   - **Root Directory:** `client`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Environment Variables:**
     - `VITE_API_BASE_URL`: Your deployed backend URL (e.g. `https://api-connectx.onrender.com/api`)
     - `VITE_SOCKET_URL`: Your deployed backend URL (e.g. `https://api-connectx.onrender.com`)

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).

