# ─── 3 BACKEND NODE.JS INSTANCES ─────────────────────────────────────────────

resource "aws_instance" "backend" {
  count = var.backend_count

  ami                    = var.ami_id
  instance_type          = var.backend_instance_type
  subnet_id              = aws_subnet.private.id
  vpc_security_group_ids = [aws_security_group.backend.id]
  key_name               = var.key_pair_name

  user_data = base64encode(templatefile("${path.module}/user_data/backend.sh", {
    instance_id    = count.index + 1
    mongo_uri      = var.mongo_uri
    redis_host     = var.redis_host
    jwt_secret     = var.jwt_secret
    docker_image   = var.docker_image_tag
  }))

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
  }

  tags = {
    Name    = "${var.project_name}-backend-${count.index + 1}"
    Project = var.project_name
    Role    = "backend"
    Index   = tostring(count.index + 1)
  }
}

# ─── NGINX LOAD BALANCER INSTANCE ────────────────────────────────────────────
# Nằm ở public subnet, có public IP, điều phối traffic vào 3 backend

resource "aws_instance" "nginx_lb" {
  ami                         = var.ami_id
  instance_type               = var.lb_instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.nginx_lb.id]
  key_name                    = var.key_pair_name
  associate_public_ip_address = true

  # Inject private IPs của 3 backends vào config nginx
  user_data = base64encode(templatefile("${path.module}/user_data/nginx_lb.sh", {
    backend_ips = aws_instance.backend[*].private_ip
  }))

  root_block_device {
    volume_type = "gp3"
    volume_size = 10
  }

  tags = {
    Name    = "${var.project_name}-nginx-lb"
    Project = var.project_name
    Role    = "load-balancer"
  }

  # Đảm bảo backends đã có IP trước khi tạo LB
  depends_on = [aws_instance.backend]
}
