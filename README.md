# Network Monitoring System

A full-stack real-time network and infrastructure monitoring platform that collects server telemetry, detects incidents, tracks heartbeat health, and visualizes system status through a live dashboard and an observability stack.

## Overview

This project is designed to monitor servers in near real time. A lightweight agent collects CPU, memory, disk, and uptime data from a machine and sends it to a Node.js backend. The backend stores metrics in MongoDB, evaluates alert rules, detects offline servers through heartbeat monitoring, and pushes live updates to a React dashboard through Socket.IO.

In addition to the application dashboard, the project also includes Prometheus and Grafana for metrics scraping and visualization, Docker and Nginx for containerized deployment, and GitHub Actions for CI/CD.

## Key Features

- Real-time server telemetry ingestion
- CPU, memory, disk, and uptime tracking
- Heartbeat-based online and offline server detection
- Alert generation for threshold breaches
- Live dashboard updates using Socket.IO
- Prometheus metrics endpoint at `/metrics`
- Grafana dashboards for observability
- Dockerized deployment with Nginx reverse proxy
- GitHub Actions based CI/CD

## Tech Stack

### Frontend

- React 19
- Vite
- Tailwind CSS
- Recharts
- Socket.IO Client
- Axios

### Backend

- Node.js
- Express
- Socket.IO
- MongoDB
- Mongoose
- JWT Authentication
- bcryptjs

### Monitoring and Infrastructure

- Prometheus
- Grafana
- Docker
- Docker Compose
- Nginx

### Automation

- GitHub Actions
- GitHub Container Registry

## Architecture

1. The agent collects local machine metrics using `systeminformation`.
2. The agent sends those metrics to the backend API at `/api/metrics`.
3. The backend stores metrics in MongoDB.
4. The backend evaluates incident thresholds for CPU, memory, and disk.
5. The backend updates server heartbeat state and marks stale servers offline.
6. Alerts are created or resolved depending on the metric state.
7. Socket.IO pushes updates to the frontend dashboard in real time.
8. Prometheus scrapes the backend `/metrics` endpoint.
9. Grafana reads Prometheus and renders dashboards.
10. Nginx serves the frontend and proxies API and realtime traffic to the backend.

## Project Workflow

### 1. Agent Flow

- The monitoring agent runs from `agent/agent.js`.
- It reads:
  - CPU load
  - memory usage
  - disk usage
  - uptime
- It sends the payload to the backend every 5 seconds.

### 2. Backend Flow

- The backend receives metrics through `POST /api/metrics`.
- The metrics controller:
  - stores the metric document
  - emits a `metricsUpdated` realtime event
  - updates the server heartbeat timestamp
  - marks the server online
  - checks alert thresholds
  - creates or resolves alerts

### 3. Heartbeat Monitoring

- A background service checks whether a server has stopped reporting.
- If the heartbeat timeout is exceeded:
  - the server status becomes `offline`
  - a heartbeat alert is created
  - the frontend is updated in real time

### 4. Frontend Flow

- The React dashboard fetches initial metrics, alerts, and servers from REST endpoints.
- It then listens to Socket.IO events for live changes.
- It renders:
  - system metric cards
  - charts
  - alert history
  - server heartbeat status

### 5. Observability Flow

- Prometheus scrapes `/metrics` from the backend.
- Grafana connects to Prometheus and displays a dashboard for:
  - online servers
  - active alerts
  - metrics ingestion
  - CPU, memory, disk usage
  - server heartbeat freshness

## Folder Structure

```text
network-monitoring-system/
|-- agent/
|   |-- agent.js
|   |-- Dockerfile
|
|-- client/
|   |-- src/
|   |   |-- App.jsx
|   |   |-- main.jsx
|   |   |-- config.js
|   |   |-- pages/Dashboard.jsx
|   |   |-- socket/socket.js
|   |-- nginx/default.conf
|   |-- Dockerfile
|
|-- server/
|   |-- config/db.js
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- services/
|   |-- server.js
|   |-- Dockerfile
|
|-- monitoring/
|   |-- prometheus/
|   |-- grafana/
|
|-- .github/workflows/
|   |-- ci.yml
|   |-- cd.yml
|
|-- docker-compose.yml
|-- .env.example
|-- README.md
```

## Important Files and What They Store

### Root

- `docker-compose.yml`
  - defines the full stack: MongoDB, backend, frontend, agent, Prometheus, and Grafana
- `.env.example`
  - sample environment variables
- `.github/workflows/ci.yml`
  - Continuous Integration workflow
- `.github/workflows/cd.yml`
  - Continuous Deployment workflow

### Agent

- `agent/agent.js`
  - collects local telemetry and sends it to the backend

### Frontend

- `client/src/main.jsx`
  - React app entrypoint
- `client/src/App.jsx`
  - renders the main dashboard
- `client/src/pages/Dashboard.jsx`
  - main UI for charts, cards, alerts, and heartbeat display
- `client/src/socket/socket.js`
  - Socket.IO connection setup
- `client/src/config.js`
  - API and socket URL configuration for local and containerized environments
- `client/nginx/default.conf`
  - Nginx reverse proxy config
- `client/Dockerfile`
  - production build and Nginx container image

### Backend

- `server/server.js`
  - main server entrypoint and route registration
- `server/config/db.js`
  - MongoDB connection
- `server/controllers/authController.js`
  - login and registration
- `server/controllers/serverController.js`
  - create and list monitored servers
- `server/controllers/metricsController.js`
  - metric ingestion, heartbeat syncing, and alert evaluation
- `server/controllers/alertController.js`
  - returns recent alerts
- `server/middleware/authMiddleware.js`
  - JWT protection middleware
- `server/services/heartbeatMonitor.js`
  - scheduled server offline detection
- `server/services/prometheusMetrics.js`
  - exposes Prometheus metrics

### Backend Models

- `server/models/User.js`
  - users
- `server/models/Server.js`
  - monitored servers and heartbeat state
- `server/models/Metrics.js`
  - telemetry data
- `server/models/Alert.js`
  - active and resolved incidents

### Monitoring

- `monitoring/prometheus/prometheus.docker.yml`
  - Prometheus scrape config for Docker networking
- `monitoring/grafana/provisioning/datasources/datasource.yml`
  - Prometheus datasource provisioning
- `monitoring/grafana/provisioning/dashboards/dashboard.yml`
  - dashboard provisioning
- `monitoring/grafana/dashboards/network-monitoring-overview.json`
  - prebuilt Grafana dashboard

## API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Servers

- `GET /api/servers`
- `POST /api/servers`

### Metrics

- `GET /api/metrics`
- `POST /api/metrics`

### Alerts

- `GET /api/alerts`

### Health and Monitoring

- `GET /`
- `GET /healthz`
- `GET /metrics`

## Environment Variables

Use `.env.example` as the starting point.

### Main variables

- `MONGO_URI`
  - MongoDB connection string
- `JWT_SECRET`
  - JWT signing secret
- `PORT`
  - backend port
- `CLIENT_ORIGIN`
  - allowed frontend origin for Socket.IO and CORS
- `SERVER_ID`
  - ID of the server record used by the agent
- `BACKEND_URL`
  - backend base URL used by the agent

## How To Run

### Option 1: Run with Docker

From the project root:

```powershell
cd C:\Users\Asus\Desktop\new-project\network-monitoring-system
docker compose up --build -d
```

Open:

- Frontend: [http://localhost](http://localhost)
- Backend: [http://localhost:5000](http://localhost:5000)
- Prometheus: [http://localhost:9090](http://localhost:9090)
- Grafana: [http://localhost:3001](http://localhost:3001)

To run the optional agent container too:

```powershell
docker compose --profile agent up -d agent
```

### Option 2: Run Manually for Development

#### Backend

```powershell
cd C:\Users\Asus\Desktop\new-project\network-monitoring-system\server
npm.cmd install
npm.cmd run dev
```

#### Frontend

```powershell
cd C:\Users\Asus\Desktop\new-project\network-monitoring-system\client
npm.cmd install
npm.cmd run dev
```

#### Agent

```powershell
cd C:\Users\Asus\Desktop\new-project\network-monitoring-system\agent
npm.cmd install
node agent.js
```

Before running the agent manually, set:

- `BACKEND_URL`
- `SERVER_ID`

## CI/CD

### CI

The CI workflow is in [.github/workflows/ci.yml](C:\Users\Asus\Desktop\new-project\network-monitoring-system\.github\workflows\ci.yml:1).

It runs on push and pull requests and:

- installs dependencies
- lints the frontend
- builds the frontend
- checks backend syntax
- checks agent syntax
- validates the Docker Compose config

### CD

The CD workflow is in [.github/workflows/cd.yml](C:\Users\Asus\Desktop\new-project\network-monitoring-system\.github\workflows\cd.yml:1).

It runs on pushes to `main` and:

- builds Docker images
- pushes them to GitHub Container Registry
- optionally deploys to a remote host over SSH

## Commands You May Need

### Start the full stack

```powershell
docker compose up --build -d
```

### Stop the full stack

```powershell
docker compose down
```

### View running containers

```powershell
docker compose ps
```

### View logs

```powershell
docker compose logs -f
```

### Run frontend lint

```powershell
cd client
npm.cmd run lint
```

### Run frontend build

```powershell
cd client
npm.cmd run build
```

### Validate Docker Compose

```powershell
docker compose config
```

## Interview Explanation

You can explain the project like this:

> This is a real-time network monitoring system where an agent collects system metrics and sends them to a Node.js backend. The backend stores the data in MongoDB, evaluates incident thresholds, tracks heartbeat health, and emits live updates through Socket.IO. The React frontend visualizes telemetry, alerts, and server liveness in real time. For production readiness, the system also exposes Prometheus metrics, uses Grafana dashboards, runs in Docker behind Nginx, and includes CI/CD with GitHub Actions.

## Current Strengths

- Clean separation of frontend, backend, agent, and monitoring layers
- Realtime updates instead of polling-only architecture
- Heartbeat-based offline detection
- Prometheus and Grafana integration
- Dockerized deployment
- CI/CD setup for validation and release flow

## Possible Improvements

- Add unit and integration tests
- Add alert delivery integrations like email or Slack
- Add stronger API validation
- Add role-based access control
- Reduce frontend bundle size with code splitting

## Additional Notes

- Monitoring-only documentation is also available in [README.monitoring.md](C:\Users\Asus\Desktop\new-project\network-monitoring-system\README.monitoring.md:1).
- Infrastructure-specific notes are also available in [README.infrastructure.md](C:\Users\Asus\Desktop\new-project\network-monitoring-system\README.infrastructure.md:1).
