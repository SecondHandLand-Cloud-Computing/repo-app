# ==============================================================================
# 1. MONITOR SERVER (Máy chủ Giám sát Độc lập)
# ==============================================================================
resource "aws_instance" "monitor_server" {
  ami                  = data.aws_ami.ubuntu.id
  instance_type          = "t3.micro"
  key_name               = "second-hand-land-key-pair"
  subnet_id              = aws_subnet.public_subnet_1.id
  vpc_security_group_ids = [aws_security_group.monitor_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.prometheus_profile.name # Cấp quyền IAM

  # Khởi động máy ảo: Tự cài Docker và pull repo Monitor về chạy
  user_data = templatefile("${path.module}/scripts/setup_monitor.sh", {
    monitor_url = var.monitor_url
    mongo_uri   = var.mongo_uri
  })

  tags = { Name = "Monitor-Server" }
}

# ==============================================================================
# 2. APPLICATION LOAD BALANCER (Bộ chia tải)
# ==============================================================================
resource "aws_lb" "app_alb" {
  name               = "cloud-app-alb"
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]
}

# Đích đến: Lắng nghe ở port 5173 và check health ở đường dẫn gốc "/"
resource "aws_lb_target_group" "app_tg" {
  name     = "cloud-app-tg"
  port     = 5000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main_vpc.id
  health_check {
    path                = "/"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

# Listener: Nhận traffic port 80 đẩy vào Target Group
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app_alb.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app_tg.arn
  }
}

# ==============================================================================
# 3. AUTO SCALING GROUP (Đàn máy ảo tự nhân bản)
# ==============================================================================

# Bản thiết kế (Khuôn đúc) cho máy ảo App Server
resource "aws_launch_template" "app_template" {
  name          = "cloud-app-template"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = "t3.micro" # Dùng t3.micro (2 vCPU)
  key_name      = "second-hand-land-key-pair"
  vpc_security_group_ids = [aws_security_group.app_sg.id]

  # User Data: Tự cài Docker, pull repo App và bơm Secrets
  user_data = base64encode(templatefile("${path.module}/scripts/setup_app.sh", {
    repo_app_url          = var.repo_app_url
    mongo_uri             = var.mongo_uri
    jwt_secret            = var.jwt_secret
    cloudinary_name       = var.cloudinary_name
    cloudinary_api_key    = var.cloudinary_api_key
    cloudinary_api_secret = var.cloudinary_api_secret
  }))

  # Đánh Tag cực kỳ quan trọng để Prometheus tự động nhận diện
  tag_specifications {
    resource_type = "instance"
    tags = { 
      Name = "App-Server"
      Role = "AppServer" 
    }
  }
}

# Khai báo cấu trúc bầy đàn: Thấp nhất 1 máy, nhiều nhất 3 máy
resource "aws_autoscaling_group" "app_asg" {
  name                = "cloud-app-asg"
  vpc_zone_identifier = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]
  target_group_arns   = [aws_lb_target_group.app_tg.arn]
  min_size            = 1
  max_size            = 3
  default_cooldown    = 60 # Scale càng nhanh càng tốt

  launch_template {
    id      = aws_launch_template.app_template.id
    version = "$Latest"
  }
}

# Luật Auto Scaling: Nếu CPU trung bình > 50% thì gọi máy bay thả thêm máy EC2
resource "aws_autoscaling_policy" "cpu_policy" {
  name                   = "cpu-target-tracking"
  autoscaling_group_name = aws_autoscaling_group.app_asg.name
  policy_type            = "TargetTrackingScaling"
  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 50.0
  }
}
