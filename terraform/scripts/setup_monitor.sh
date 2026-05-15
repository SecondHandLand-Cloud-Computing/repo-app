#!/bin/bash
# Tự động cập nhật và cài đặt Docker, Git
sudo apt update -y
sudo apt install -y docker.io docker-compose git

# Kéo mã nguồn của Monitor Server về
git clone ${monitor_url} /home/ubuntu/monitoring
cd /home/ubuntu/monitoring

# Bơm biến môi trường DB vào file .env an toàn
cat << 'EOF' > .env
MONGO_URI=${mongo_uri}
EOF

# Chạy Docker Compose cho Prometheus, Grafana, Exporters
sudo docker-compose up -d
