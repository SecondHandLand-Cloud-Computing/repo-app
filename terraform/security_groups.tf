# ==============================================================================
# SECURITY GROUPS (FIREWALLS)
# ==============================================================================

# 1. Tường lửa cho ALB: Điểm tiếp xúc trực tiếp với Internet
resource "aws_security_group" "alb_sg" {
  name        = "cloud_alb_sg"
  description = "Cho phep Traffic tu Internet vao Load Balancer"
  vpc_id      = aws_vpc.main_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 2. Tường lửa cho Monitor Server: Cho phép truy cập Dashboard và SSH
resource "aws_security_group" "monitor_sg" {
  name        = "cloud_monitor_sg"
  description = "Tuong lua rieng cho may chu Giam sat"
  vpc_id      = aws_vpc.main_vpc.id

  ingress {
    from_port   = 3000 # Cổng của Grafana
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 22 # Mở SSH để debug nếu cần
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 9090 # Cổng của Prometheus
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 3. Tường lửa cho App Server: TUYỆT ĐỐI BẢO MẬT, chặn truy cập trực tiếp
resource "aws_security_group" "app_sg" {
  name        = "cloud_app_sg"
  description = "Block Internet, chi nhan traffic tu ALB va Monitor"
  vpc_id      = aws_vpc.main_vpc.id

  # Cho phép Monitor Server gọi vào cAdvisor để lấy metrics CPU
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.monitor_sg.id]
  }
  # Cho phép Monitor Server gọi vào Redis Exporter
  ingress {
    from_port       = 9121
    to_port         = 9121
    protocol        = "tcp"
    security_groups = [aws_security_group.monitor_sg.id] 
  }
  # Cho phép Monitor Server VÀ ALB gọi vào Backend Node.js
  ingress {
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.monitor_sg.id, aws_security_group.alb_sg.id]
  }
  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    cidr_blocks     = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
