# ==============================================================================
# S3 BUCKET CHO FRONTEND (STATIC WEBSITE HOSTING)
# ==============================================================================

# 1. Tạo random string để đảm bảo tên bucket không bị trùng (Global Unique)
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# 2. Tạo S3 Bucket
resource "aws_s3_bucket" "frontend_bucket" {
  bucket        = "second-hand-land-frontend-${random_string.suffix.result}" 
  force_destroy = true # Cho phép xóa bucket kể cả khi có file bên trong
}

# 3. Bật tính năng Website Hosting cho phép truy cập như trang web
resource "aws_s3_bucket_website_configuration" "frontend_website" {
  bucket = aws_s3_bucket.frontend_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html" # Rất quan trọng cho React Router (Tránh lỗi 404 khi F5)
  }
}

# 4. Tắt tính năng chặn Public Access (Mở khóa cửa ngoài)
resource "aws_s3_bucket_public_access_block" "frontend_public_access" {
  bucket = aws_s3_bucket.frontend_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# 5. Cấp quyền Public Read cho tất cả các file trong Bucket (Mở khóa cửa trong)
resource "aws_s3_bucket_policy" "allow_public_read" {
  bucket = aws_s3_bucket.frontend_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend_bucket.arn}/*"
      }
    ]
  })

  # Đảm bảo phải tắt Public Block xong thì mới dán Policy được
  depends_on = [aws_s3_bucket_public_access_block.frontend_public_access]
}
