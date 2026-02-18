#!/usr/bin/env bash
set -euo pipefail

REGISTRY="git.simon-franken.de"
CHART_DIR="timetracker-chart"

# Load .env file if present (values do not override existing env variables)
if [[ -f ".env" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip comments and blank lines
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    # Only set if not already in environment
    key="${line%%=*}"
    if [[ -z "${!key+x}" ]]; then
      export "$line"
    fi
  done < ".env"
fi

# Resolve credentials: env/file takes precedence, otherwise prompt
if [[ -z "${REGISTRY_USER:-}" ]]; then
  read -rp "Registry username: " REGISTRY_USER
fi

if [[ -z "${REGISTRY_PASSWORD:-}" ]]; then
  read -rsp "Registry password for ${REGISTRY_USER}@${REGISTRY}: " REGISTRY_PASSWORD
  echo
fi

BACKEND_IMAGE="${REGISTRY}/${REGISTRY_USER}/timetracker-backend:latest"
FRONTEND_IMAGE="${REGISTRY}/${REGISTRY_USER}/timetracker-frontend:latest"

# --- Docker ---
echo "Logging in to ${REGISTRY}..."
echo "${REGISTRY_PASSWORD}" | docker login "${REGISTRY}" -u "${REGISTRY_USER}" --password-stdin

echo "Building backend image..."
docker build -t "${BACKEND_IMAGE}" ./backend

echo "Building frontend image..."
docker build -t "${FRONTEND_IMAGE}" ./frontend

echo "Pushing backend image..."
docker push "${BACKEND_IMAGE}"

echo "Pushing frontend image..."
docker push "${FRONTEND_IMAGE}"

# --- Helm chart ---
echo "Packaging Helm chart..."
CHART_PACKAGE=$(helm package "${CHART_DIR}" | awk '{print $NF}')
CHART_FILE=$(basename "${CHART_PACKAGE}")

echo "Pushing Helm chart (${CHART_FILE})..."
curl --fail --user "${REGISTRY_USER}:${REGISTRY_PASSWORD}" \
  -X POST \
  --upload-file "./${CHART_FILE}" \
  "https://${REGISTRY}/api/packages/${REGISTRY_USER}/helm/api/charts"

# Clean up packaged chart
rm -f "./${CHART_FILE}"

echo "Done."
