output "lb_public_ip" {
  description = "Public IP của Nginx Load Balancer — trỏ domain vào đây"
  value       = aws_instance.nginx_lb.public_ip
}

output "lb_public_dns" {
  description = "Public DNS của Nginx Load Balancer"
  value       = aws_instance.nginx_lb.public_dns
}

output "backend_private_ips" {
  description = "Private IPs của 3 backend instances"
  value       = aws_instance.backend[*].private_ip
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "ID của public subnet (LB)"
  value       = aws_subnet.public.id
}

output "private_subnet_id" {
  description = "ID của private subnet (backends)"
  value       = aws_subnet.private.id
}

output "api_endpoint" {
  description = "Endpoint gọi API"
  value       = "http://${aws_instance.nginx_lb.public_ip}/api"
}
