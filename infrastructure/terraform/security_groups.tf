# ─── SECURITY GROUP: Nginx Load Balancer ─────────────────────────────────────
# Cho phép traffic HTTP/HTTPS từ internet, chặn mọi thứ khác

resource "aws_security_group" "nginx_lb" {
  name        = "${var.project_name}-lb-sg"
  description = "Security group cho Nginx Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP từ internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS từ internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH để quản trị"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Cho phép mọi traffic ra ngoài"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-lb-sg"
    Project = var.project_name
  }
}

# ─── SECURITY GROUP: Backend Node.js Instances ───────────────────────────────
# Chỉ nhận traffic từ LB security group, không expose ra ngoài internet

resource "aws_security_group" "backend" {
  name        = "${var.project_name}-backend-sg"
  description = "Security group cho 3 backend Node.js instances"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "API port — chỉ LB mới được gọi vào"
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.nginx_lb.id]
  }

  ingress {
    description = "SSH để quản trị"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    description = "Cho phép mọi traffic ra ngoài (cần để kéo Docker image qua NAT)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-backend-sg"
    Project = var.project_name
  }
}
