# 🛍️ MyStore — Production E-Commerce Platform

A full-stack, microservices-based e-commerce platform built with modern technologies. Sell products online with a beautiful storefront, real-time order tracking, Stripe payments, and a powerful admin dashboard.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENTS                             │
│  Browser (Next.js 14)  ·  Mobile  ·  Admin Panel           │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│              API GATEWAY  :3000  (Cluster)                   │
│  Rate Limiting · JWT Auth · Proxy · Socket.IO · CORS        │
└──┬─────────┬────────────┬──────────┬──────────┬─────────────┘
   │         │            │          │          │
   ▼         ▼            ▼          ▼          ▼
 AUTH     PRODUCT      ORDER      PAYMENT   NOTIFY
:3001      :3002        :3003      :3004     :3005
   │         │            │          │          │
   ▼         ▼            ▼          ▼          ▼
MongoDB   MongoDB      MongoDB    MongoDB   BullMQ
          + Redis      + BullMQ   Stripe    + SMTP
          + Workers
```

## 🚀 Tech Stack

| Layer          | Technology                                         |
|----------------|----------------------------------------------------|
| **Frontend**   | Next.js 14 (App Router), React 18, Tailwind CSS    |
| **State**      | Zustand, TanStack React Query                      |
| **Payments**   | Stripe (Payment Intents + Checkout Sessions)       |
| **API Gateway**| Node.js + Express + http-proxy-middleware          |
| **Auth**       | JWT access tokens + refresh token rotation         |
| **Database**   | MongoDB (one DB per service)                       |
| **Cache**      | Redis (product cache, rate-limit, token blacklist) |
| **Queues**     | BullMQ (order processing, notifications)           |
| **Messages**   | RabbitMQ (inter-service events)                    |
| **Performance**| Node Cluster (all services), Worker Threads (images)|
| **Real-time**  | Socket.IO (order status updates)                   |
| **Email**      | Nodemailer + HTML templates                        |
| **Container**  | Docker + Docker Compose                            |

---

## 📁 Project Structure

```
E-commerce/
├── docker-compose.yml          # Full stack orchestration
├── docker-compose.prod.yml     # Production overrides
├── .env.example                # Environment template
├── Makefile                    # Developer commands
├── scripts/
│   └── mongo-init.js           # DB init + indexes
│
├── services/
│   ├── api-gateway/            # :3000 — Entry point
│   │   ├── src/cluster.js      # Node Cluster master
│   │   ├── src/server.js       # Express + Socket.IO
│   │   ├── src/middleware/
│   │   │   ├── auth.js         # JWT verification
│   │   │   └── rateLimiter.js  # Redis-backed rate limits
│   │   └── Dockerfile
│   │
│   ├── auth-service/           # :3001 — JWT + Users
│   │   ├── src/models/User.js
│   │   ├── src/controllers/auth.controller.js
│   │   └── src/utils/tokens.js
│   │
│   ├── product-service/        # :3002 — Catalog
│   │   ├── src/models/Product.js
│   │   ├── src/config/redis.js  # 10-min cache
│   │   ├── src/workers/
│   │   │   └── imageProcessor.js  # Worker Thread
│   │   └── src/utils/workerPool.js
│   │
│   ├── order-service/          # :3003 — Orders
│   │   ├── src/models/Order.js
│   │   ├── src/queues/orderQueue.js  # BullMQ
│   │   └── src/workers/orderWorker.js
│   │
│   ├── payment-service/        # :3004 — Stripe
│   │   ├── src/controllers/payment.controller.js
│   │   └── src/routes/payment.routes.js
│   │
│   └── notification-service/   # :3005 — Email
│       └── src/workers/emailWorker.js  # BullMQ
│
└── frontend/                   # :3006 — Next.js 14
    ├── src/app/                # App Router pages
    │   ├── page.tsx            # Home
    │   ├── products/           # Product listing + detail
    │   ├── checkout/           # Stripe checkout
    │   ├── orders/             # Order history
    │   ├── login/ register/    # Auth pages
    │   └── admin/              # Admin dashboard
    ├── src/components/
    │   ├── layout/Navbar.tsx
    │   ├── product/ProductCard.tsx
    │   ├── cart/CartDrawer.tsx
    │   └── home/               # Hero, Featured, Categories
    ├── src/store/
    │   ├── cartStore.ts        # Zustand + localStorage
    │   └── authStore.ts        # Zustand + cookies
    └── src/lib/api.ts          # Axios + auto token refresh
```

---

## ⚡ Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (for webhook testing)

### 1. Clone & Configure

```bash
cd /path/to/E-commerce
cp .env.example .env
# Edit .env — fill in your STRIPE keys
```

### 2. Start Everything

```bash
make up
# or: docker compose up -d
```

Services will be available at:

| Service            | URL                            |
|--------------------|--------------------------------|
| **Storefront**     | http://localhost:3006          |
| **API Gateway**    | http://localhost:3000          |
| **Auth Service**   | http://localhost:3001          |
| **Product Service**| http://localhost:3002          |
| **Order Service**  | http://localhost:3003          |
| **Payment Service**| http://localhost:3004          |
| **Mongo Express**  | http://localhost:8081          |
| **Redis Commander**| http://localhost:8082          |
| **RabbitMQ UI**    | http://localhost:15672         |

### 3. Test Stripe Webhooks Locally

```bash
make stripe-listen
# In another terminal, the webhook secret will be printed — add to .env
```

---

## 🔧 Local Development (without Docker)

```bash
# Start only infrastructure
make dev-infra

# Install all dependencies
make install

# In separate terminals, start each service:
cd services/auth-service    && npm run dev
cd services/product-service && npm run dev
cd services/order-service   && npm run dev
cd services/payment-service && npm run dev
cd services/notification-service && npm run dev
cd services/api-gateway     && npm run dev
cd frontend                 && npm run dev
```

---

## 🧠 Key Architecture Decisions

### Node Cluster
Every service uses `src/cluster.js` to fork one worker per CPU core, maximizing throughput on multi-core machines. The master process automatically respawns crashed workers.

### Worker Threads (Image Processing)
When a product image is uploaded, it's offloaded to a **Worker Thread pool** (`services/product-service/src/utils/workerPool.js`). The main thread stays unblocked while Sharp resizes images to thumbnail/medium/large WebP variants in parallel.

### BullMQ Order Processing
Placing an order triggers a BullMQ job chain:
1. `process-order` → reserve inventory, update product stock
2. `confirm-order` → called by payment webhook, marks order confirmed
3. `notifications/order-confirmation` → sends confirmation email

Jobs have exponential backoff (3 retries), progress tracking, and are visible in Redis Commander.

### Redis Caching Strategy
| Key Pattern            | TTL     | Invalidated When     |
|------------------------|---------|----------------------|
| `products:list:*`      | 5 min   | Product created/updated |
| `products:single:*`    | 10 min  | Product updated      |
| `products:featured`    | 15 min  | Product toggled      |
| `categories:all`       | 1 hour  | Category changed     |
| `blacklist:<token>`    | token TTL | On logout          |
| `refresh:<userId>:<h>` | 7 days  | On logout/password change |

### JWT Token Rotation
- **Access tokens** expire in 15 minutes
- **Refresh tokens** expire in 7 days, stored hashed in Redis
- On refresh, old token is deleted and a new pair is issued (rotation)
- On logout, access token is blacklisted and refresh token deleted
- On password change, ALL refresh tokens for the user are revoked

### Stripe Integration
Two Stripe flows are implemented:
1. **Payment Intents** — for custom checkout UI with Stripe Elements
2. **Checkout Sessions** — for Stripe-hosted checkout page

Webhooks handle async confirmation (`payment_intent.succeeded`, `checkout.session.completed`, `charge.refunded`).

---

## 🔌 API Reference

### Auth (`/api/auth`)
| Method | Path              | Auth | Description                |
|--------|-------------------|------|----------------------------|
| POST   | /register         | ✗    | Register new user           |
| POST   | /login            | ✗    | Login, get tokens           |
| POST   | /refresh          | ✗    | Refresh access token        |
| POST   | /logout           | ✓    | Logout, revoke tokens       |
| GET    | /me               | ✓    | Get current user            |
| PATCH  | /me               | ✓    | Update profile              |
| PATCH  | /me/password      | ✓    | Change password             |

### Products (`/api/products`)
| Method | Path                  | Auth     | Description           |
|--------|-----------------------|----------|-----------------------|
| GET    | /products             | ✗        | List with filters     |
| GET    | /products/featured    | ✗        | Featured products     |
| GET    | /products/:id         | ✗        | Get by ID or slug     |
| POST   | /products             | Admin    | Create product        |
| PUT    | /products/:id         | Admin    | Update product        |
| DELETE | /products/:id         | Admin    | Soft delete           |
| POST   | /products/:id/images  | Admin    | Upload images (W.Thread)|
| POST   | /products/:id/reviews | Auth     | Add review            |
| PATCH  | /products/:id/stock   | Admin    | Update stock          |

### Orders (`/api/orders`)
| Method | Path                        | Auth  | Description      |
|--------|-----------------------------|-------|------------------|
| POST   | /orders                     | ✓     | Place order      |
| GET    | /orders                     | ✓     | My orders        |
| GET    | /orders/:id                 | ✓     | Get order        |
| PATCH  | /orders/:id/cancel          | ✓     | Cancel order     |
| GET    | /admin/orders               | Admin | All orders       |
| PATCH  | /admin/orders/:id/status    | Admin | Update status    |
| GET    | /admin/orders/stats         | Admin | Dashboard stats  |

### Payments (`/api/payments`)
| Method | Path                        | Auth  | Description         |
|--------|-----------------------------|-------|---------------------|
| POST   | /payments/create-intent     | ✓     | Create PaymentIntent|
| POST   | /payments/checkout-session  | ✓     | Create hosted session|
| POST   | /payments/webhook           | Stripe| Stripe webhook      |
| POST   | /payments/refund            | Admin | Issue refund        |

---

## 📊 Admin Dashboard

Navigate to **http://localhost:3006/admin** (requires admin role)

Features:
- **Dashboard** — Revenue, order count, today's orders, pending count
- **Products** — Full CRUD, image upload, stock management
- **Orders** — Update order status (processing → shipped → delivered), real-time refresh
- **Analytics** — Order status breakdown charts

---

## 🔒 Security Features

- **Helmet.js** on every service (XSS, clickjacking, MIME headers)
- **Rate limiting** — Redis-backed per-IP (500 req/15min global, 20/15min auth)
- **JWT blacklisting** — Revoked tokens stored in Redis until natural expiry
- **Refresh token rotation** — Single-use tokens prevent reuse after logout
- **Password hashing** — bcrypt with cost factor 12
- **Raw body preservation** — Stripe webhook signature validation preserved
- **CORS** — Restricted to frontend origin only

---

## 🚢 Production Deployment

### Environment Variables Checklist
- [ ] `JWT_SECRET` — long random string (32+ chars)
- [ ] `JWT_REFRESH_SECRET` — different long random string
- [ ] `STRIPE_SECRET_KEY` — live key from Stripe dashboard
- [ ] `STRIPE_WEBHOOK_SECRET` — from Stripe webhook endpoint
- [ ] `MONGO_ROOT_PASS` — strong password
- [ ] `REDIS_PASSWORD` — strong password
- [ ] `SMTP_*` — production SMTP (SendGrid, SES, etc.)

### Recommended: Deploy to
- **Backend**: AWS ECS, Railway, Render, Fly.io
- **Frontend**: Vercel (easiest for Next.js)
- **MongoDB**: MongoDB Atlas
- **Redis**: Redis Cloud or Upstash
- **RabbitMQ**: CloudAMQP

---

## 📝 License

MIT — build something great!
