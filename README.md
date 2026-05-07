# Second-Hand Land

> A cloud-native, full-stack e-commerce platform for buying and selling second-hand goods — built for scalability, observability, and developer experience.

[![Node.js](https://img.shields.io/badge/Backend-Express.js-green?logo=node.js)](https://expressjs.com/)
[![React](https://img.shields.io/badge/Frontend-React-blue?logo=react)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-darkgreen?logo=mongodb)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Cache-Redis-red?logo=redis)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Infra-Docker-blue?logo=docker)](https://www.docker.com/)
[![Prometheus](https://img.shields.io/badge/Monitoring-Prometheus-orange?logo=prometheus)](https://prometheus.io/)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Clone the Repository](#1-clone-the-repository)
  - [Environment Variables](#2-environment-variables)
  - [Run with Docker Compose](#3-run-with-docker-compose-recommended)
  - [Run Locally](#4-run-locally-development)
- [Services & Ports](#services--ports)
- [Monitoring Stack](#monitoring-stack)
- [Commit Convention](#commit-convention)
- [License](#license)

---

## Overview

**Second-Hand Land** is a marketplace platform that allows users to list, browse, and purchase second-hand items. The system is fully containerized and ships with a complete observability stack (Prometheus + Grafana) out of the box.

Key engineering highlights:

- **Versioned cache keys** on Redis to eliminate cache invalidation race conditions
- **MongoDB transactions** for atomic order processing with lock failure detection
- **Graceful Redis degradation** — the app continues serving requests even when Redis is unavailable
- **Business metrics** (checkout success/failure rate, latency histograms) exported to Prometheus
- **Role-based access control** (customer / admin) with JWT authentication

---

## Architecture

```
+------------------+     +-------------------------------------------+
|     Browser      |---->|  Nginx (Reverse Proxy)                    |
+------------------+     |  :80  --> React Frontend  (:5173)         |
                         |  /api --> Express Backend (:5000)         |
                         +-------------------------------------------+
                                            |
                         +------------------v--------------------+
                         |          Express.js Backend           |
                         |  +------------+  +-----------------+  |
                         |  |  MongoDB   |  |   Redis Cache   |  |
                         |  |  :27017    |  |   :6379         |  |
                         |  +------------+  +-----------------+  |
                         +---------------------------------------+
                                            |
                         +------------------v--------------------+
                         |          Observability Stack          |
                         |  Prometheus :9090 --> Grafana :3000   |
                         |  cAdvisor   :8080  (container stats)  |
                         |  redis-exporter    :9121              |
                         |  mongodb-exporter  :9216              |
                         +---------------------------------------+
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | Node.js, Express.js |
| Database | MongoDB 6.0 |
| Cache | Redis 7 |
| Authentication | JWT (cookie-based) |
| File Storage | Cloudinary |
| Containerization | Docker, Docker Compose |
| Monitoring | Prometheus, Grafana |
| Container Metrics | cAdvisor |
| Reverse Proxy | Nginx |

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose v2+
- [Node.js](https://nodejs.org/) v18+ (required for local development only)

---

### 1. Clone the Repository

```bash
git clone https://github.com/Trung4n/second-hand-land.git
cd second-hand-land
```

---

### 2. Environment Variables

Create a `.env` file at the **root** directory:

```env
MONGO_USER=your_mongo_username
MONGO_PASSWORD=your_mongo_password
```

Create a `server/.env` file for backend configuration:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://<user>:<password>@mongo:27017/admin?authSource=admin
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your_jwt_secret
COOKIE_SECURE=false

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Mailer
MAIL_USER=...
MAIL_PASS=...
OTP_EXPIRE_SEC=300
```

---

### 3. Run with Docker Compose (Recommended)

```bash
docker compose up --build
```

All services start automatically. The backend waits for MongoDB and Redis health checks to pass before accepting connections.

---

### 4. Run Locally (Development)

Install dependencies:

```bash
# Install all workspace dependencies from the root
npm install

# Or install each package separately
cd client && npm install
cd server && npm install
```

Start the development servers:

```bash
# Run frontend and backend concurrently from the root
npm run dev

# Or start each service individually
cd client && npm start        # React dev server  (http://localhost:5173)
cd server && npm run dev      # Express with hot reload (http://localhost:5000)
```

---

## Services & Ports

| Service | URL | Description |
|---|---|---|
| Frontend | http://localhost:5173 | React application |
| Backend API | http://localhost:5001 | Express REST API |
| MongoDB | localhost:27017 | Primary database |
| Redis | localhost:6379 | Cache layer |
| Grafana | http://localhost:3000 | Monitoring dashboards |
| Prometheus | http://localhost:9090 | Metrics collection |
| cAdvisor | http://localhost:8080 | Container resource metrics |
| Redis Exporter | http://localhost:9121 | Redis metrics for Prometheus |
| MongoDB Exporter | http://localhost:9216 | MongoDB metrics for Prometheus |

---

## Monitoring Stack

The project ships with a pre-configured Prometheus + Grafana observability stack. Dashboards are provisioned automatically from `./grafana/provisioning/` — no manual setup required.

**Metrics tracked:**

| Category | Metric |
|---|---|
| HTTP | Request rate, latency, error rate |
| Database | MongoDB query duration (slow query detection) |
| Cache | Redis cache hit/miss ratio |
| Business | Checkout success/failure rate, P50/P95/P99 latency |
| Infrastructure | Container CPU and memory usage via cAdvisor |
| Concurrency | MongoDB transaction lock failures |

Open Grafana at http://localhost:3000 after running `docker compose up`.

---

## Commit Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

**Format:**

```
<type>(<scope>): <short description>

[optional body]
```

| Type | Meaning |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `refactor` | Code change that is neither a fix nor a feature |
| `docs` | Documentation updates |
| `style` | Formatting, whitespace, or punctuation changes |
| `test` | Adding or updating tests |
| `chore` | Build process or tooling changes |
| `perf` | Performance improvements |
| `ci` | CI/CD configuration changes |

**Set up the commit message template** (run once after cloning):

```bash
git config commit.template .gitmessage.txt
```

---

## License

[MIT](./LICENSE)
