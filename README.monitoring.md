# Monitoring Stack

This project now includes Prometheus and Grafana integration for the backend network monitoring system.

## What was added

- Backend scrape endpoint at `GET /metrics`
- Prometheus config at `monitoring/prometheus/prometheus.yml`
- Grafana datasource and dashboard provisioning under `monitoring/grafana`
- Docker Compose stack at `docker-compose.monitoring.yml`

## Run it

1. Start the backend on port `5000`.
2. From the project root, run `docker compose -f docker-compose.monitoring.yml up -d`.
3. Open Prometheus at `http://localhost:9090`.
4. Open Grafana at `http://localhost:3001`.
5. Sign in with `admin` / `admin`.

## Notes

- Prometheus scrapes `http://host.docker.internal:5000/metrics`, so the Node backend should be running on the host machine.
- If your backend listens on a different port, update `monitoring/prometheus/prometheus.yml`.
- The dashboard is preloaded as `Network Monitoring Overview`.
