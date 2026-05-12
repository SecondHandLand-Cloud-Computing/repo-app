variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-southeast-1"
}

variable "project_name" {
  description = "Project name prefix for all resources"
  type        = string
  default     = "cloud-computing"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for public subnet — nơi Nginx LB sống"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr" {
  description = "CIDR block for private subnet — nơi 3 backend Node.js sống"
  type        = string
  default     = "10.0.2.0/24"
}

variable "ami_id" {
  description = "Ubuntu 22.04 LTS AMI ID cho ap-southeast-1 (Singapore)"
  type        = string
  default     = "ami-0df7a207adb9748c7"
}

variable "backend_instance_type" {
  description = "EC2 instance type cho 3 backend Node.js"
  type        = string
  default     = "t3.small"
}

variable "lb_instance_type" {
  description = "EC2 instance type cho Nginx Load Balancer"
  type        = string
  default     = "t3.micro"
}

variable "backend_count" {
  description = "Số lượng backend Node.js instances"
  type        = number
  default     = 3
}

variable "key_pair_name" {
  description = "Tên EC2 Key Pair để SSH vào instances"
  type        = string
  default     = "cloud-computing-key"
}

variable "mongo_uri" {
  description = "MongoDB connection string cho backend"
  type        = string
  sensitive   = true
}

variable "redis_host" {
  description = "Redis hostname"
  type        = string
}

variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
}

variable "docker_image_tag" {
  description = "Docker image tag cho backend (từ ECR hoặc Docker Hub)"
  type        = string
  default     = "cloud_backend:latest"
}
