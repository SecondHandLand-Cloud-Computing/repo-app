#!/bin/bash
set -e

# Terraform templatefile inject danh sách private IPs của 3 backends vào đây
BACKEND_IPS=(${join(" ", backend_ips)})

# ─── Cài Nginx ────────────────────────────────────────────────────────────────
apt-get update -y
apt-get install -y nginx

# ─── Tạo upstream config từ danh sách IP ─────────────────────────────────────
UPSTREAM_BLOCK=""
for ip in "$${BACKEND_IPS[@]}"; do
  UPSTREAM_BLOCK="$UPSTREAM_BLOCK    server $ip:5000;\n"
done

# ─── Ghi nginx.conf ───────────────────────────────────────────────────────────
cat > /etc/nginx/nginx.conf << EOF
events {
  worker_connections 1024;
}

http {
  upstream nodejs_cluster {
    least_conn;
$(printf "    server %s:5000;\n" "$${BACKEND_IPS[@]}")
  }

  server {
    listen 80;
    server_name _;

    location /api/ {
      proxy_pass         http://nodejs_cluster;
      proxy_http_version 1.1;
      proxy_set_header   Host              \$host;
      proxy_set_header   X-Real-IP         \$remote_addr;
      proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto \$scheme;
      proxy_read_timeout 60s;
      proxy_connect_timeout 10s;
    }

    location /health {
      return 200 "LB OK\n";
      add_header Content-Type text/plain;
    }

    location / {
      return 404;
    }
  }
}
EOF

nginx -t
systemctl restart nginx
systemctl enable nginx

echo "Nginx LB configured with backends: $${BACKEND_IPS[*]}"
