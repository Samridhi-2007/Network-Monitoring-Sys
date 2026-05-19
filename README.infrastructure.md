# Infrastructure and CI/CD

This project now includes Dockerized deployment, Nginx reverse proxying, Prometheus and Grafana observability, and GitHub Actions based CI/CD.

## Stack

- `mongo`: persistent MongoDB database
- `server`: Node.js API and Socket.IO backend
- `client`: Vite React frontend served through Nginx
- `agent`: optional telemetry sender service
- `prometheus`: scrapes backend metrics from `/metrics`
- `grafana`: preprovisioned dashboards for observability

## Local container startup

1. Copy `.env.example` to `.env`.
2. Set `JWT_SECRET` and any image overrides you want.
3. Run `docker compose up --build -d`.
4. Open:
   - Frontend: `http://localhost`
   - Backend: `http://localhost:5000`
   - Prometheus: `http://localhost:9090`
   - Grafana: `http://localhost:3001`

To start the telemetry agent too, set `SERVER_ID` in `.env` and run:

`docker compose --profile agent up -d agent`

## Nginx

The frontend container includes an Nginx config that:

- serves the built React app
- proxies `/api/` to the backend
- proxies `/socket.io/` for realtime updates
- proxies `/metrics` if you want a single public entrypoint

## CI

`.github/workflows/ci.yml` runs on pushes and pull requests and does the following:

- installs dependencies for client, server, and agent
- lints the frontend
- builds the frontend
- runs Node syntax checks for backend and agent files
- validates the Docker Compose configuration

## CD

`.github/workflows/cd.yml` runs on pushes to `main` and on manual dispatch:

- builds and publishes Docker images to GitHub Container Registry
- optionally deploys over SSH if these repository secrets exist:
  - `DEPLOY_HOST`
  - `DEPLOY_USER`
  - `DEPLOY_SSH_KEY`
  - `MONGO_URI`
  - `JWT_SECRET`
  - `CLIENT_ORIGIN`
  - `SERVER_ID`

If deploy secrets are not configured, the workflow still publishes versioned images successfully.
