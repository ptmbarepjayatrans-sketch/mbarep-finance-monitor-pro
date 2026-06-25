# MBAREP FINANCE MONITOR PRO
**Enterprise Financial Command Center** by PT MBAREP JAYA TRANS

```
 __  __ ______   ___  ____  _____ ____  
|  \/  |  _ \ \ V / / |/ / _ \| ____|  _ \ 
| |\/| | |_) \ V /| ' / (_) | |_ | |_) |
| |  | |  _ < | | | . \___/|  _| |  __/ 
|_|  |_|_| \_\|_| |_|\_\   |_|   |_|    

DIREKTUR: Kiki Dafit Pratama
BIDANG: Travel | Carter | Rental | Pariwisata
```

## 🎯 Tujuan Utama
Memonitor seluruh transaksi masuk dari aplikasi perbankan, e-wallet, merchant, QRIS, dan pembayaran digital dengan notifikasi Android realtime, server backend, dashboard command center, dan analitik keuangan enterprise-grade.

## 📊 Stack Technology
- **Backend**: Node.js + Express + Socket.IO + Prisma + PostgreSQL + Redis
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Mobile**: PWA + Service Workers
- **Android**: Kotlin + Notification Listener Service
- **Real-time**: Socket.IO WebSocket
- **Deployment**: Replit + Cloudflare Tunnel
- **Observability**: Winston Logger + Prometheus Ready

## 📁 Struktur Monorepo
```
mbarep-finance-monitor-pro/
├── backend/                    # Express API Server
├── frontend/                   # React Dashboard
├── android/                    # Notification Collector
├── docs/                       # Documentation
├── docker/                     # Docker Configuration
├── scripts/                    # Setup Scripts
├── .replit
├── replit.nix
└── README.md
```

## 🚀 Quick Start

### Installation
```bash
cd mbarep-finance-monitor-pro
npm run install:all
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

## 🏢 Company Info
**PT MBAREP JAYA TRANS**
- Direktur: Kiki Dafit Pratama
- Bidang: Travel, Carter, Rental Mobil, Pariwisata
- Platform: MBAREP FINANCE MONITOR PRO
- Versi: 1.0.0 Enterprise Edition

**Built with ❤️ for Enterprise Financial Management**