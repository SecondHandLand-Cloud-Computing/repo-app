# Xuất ra IP của Server sau khi tạo xong

output "ALB_DNS_Name" {
  description = "Link truy cập Website (Nhập vào Locust)"
  value       = aws_lb.app_alb.dns_name
}

output "Monitor_Public_IP" {
  description = "Link truy cập Grafana"
  value       = "http://${aws_instance.monitor_server.public_ip}:3000"
}

output "Frontend_S3_URL" {
  description = "Link truy cập Frontend trên S3"
  value       = "http://${aws_s3_bucket_website_configuration.frontend_website.website_endpoint}"
}
