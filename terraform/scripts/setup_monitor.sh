#!/bin/bash
# Tự động cập nhật và cài đặt Docker, Git
sudo apt update -y
sudo apt install -y docker.io docker-compose git

# Kéo mã nguồn của Monitor Server về
# Thêm Swap RAM ảo (2GB) để tránh bị tràn RAM (OOM) làm sập Prometheus
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

git clone ${monitor_url} /home/ubuntu/monitoring
cd /home/ubuntu/monitoring

# Bơm biến môi trường DB vào file .env an toàn
cat << 'EOF' > .env
MONGO_URI=${mongo_uri}
EOF

# Chạy Docker Compose cho Prometheus, Grafana, Exporters
sudo docker-compose up -d
