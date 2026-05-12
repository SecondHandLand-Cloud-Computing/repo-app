#!/bin/bash
set -e

INSTANCE_ID="${instance_id}"
MONGO_URI="${mongo_uri}"
REDIS_HOST="${redis_host}"
JWT_SECRET="${jwt_secret}"
DOCKER_IMAGE="${docker_image}"

# ─── Cài Docker ──────────────────────────────────────────────────────────────
apt-get update -y
apt-get install -y ca-certificates curl gnupg

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl start docker
systemctl enable docker

# ─── Ghi file .env cho container ─────────────────────────────────────────────
mkdir -p /opt/cloud-backend

cat > /opt/cloud-backend/.env << EOF
NODE_ENV=production
PORT=5000
INSTANCE_ID=$INSTANCE_ID
MONGO_URI=$MONGO_URI
REDIS_HOST=$REDIS_HOST
REDIS_PORT=6379
JWT_SECRET=$JWT_SECRET
COOKIE_SECURE=true
CORS_ORIGIN=*
EOF

# ─── Kéo image và chạy container ─────────────────────────────────────────────
docker pull "$DOCKER_IMAGE"

docker run -d \
  --name cloud-backend \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file /opt/cloud-backend/.env \
  "$DOCKER_IMAGE"

echo "Backend instance $INSTANCE_ID started on port 5000"
