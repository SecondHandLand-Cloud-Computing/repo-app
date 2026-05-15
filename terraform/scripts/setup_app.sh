#!/bin/bash
# Tự động cập nhật và cài đặt Docker, Git
sudo apt update -y
sudo apt install -y docker.io docker-compose git

# Kéo mã nguồn của App Server về
git clone ${repo_app_url} /home/ubuntu/repo-app
cd /home/ubuntu/repo-app/server

# Bơm Secrets từ Terraform vào biến môi trường (.env) an toàn tuyệt đối
echo "" >> .env
cat << 'EOF' >> .env
MONGO_URI=${mongo_uri}
JWT_SECRET=${jwt_secret}
EOF

# Chạy Docker Compose
cd ..
sudo docker-compose up -d --build
