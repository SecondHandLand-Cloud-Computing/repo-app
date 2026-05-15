# ==============================================================================
# IAM ROLES & POLICIES
# ==============================================================================

# Tạo một Role định danh cho máy EC2
resource "aws_iam_role" "prometheus_discovery_role" {
  name = "prometheus_ec2_discovery_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

# Cấp quyền: Cho phép Role này đọc danh sách IP của các EC2 khác
resource "aws_iam_role_policy" "prometheus_policy" {
  name   = "prometheus_describe_ec2_policy"
  role   = aws_iam_role.prometheus_discovery_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["ec2:DescribeInstances"]
      Effect   = "Allow"
      Resource = "*"
    }]
  })
}

# Bọc Role lại thành Instance Profile để có thể nhét vào máy ảo EC2
resource "aws_iam_instance_profile" "prometheus_profile" {
  name = "prometheus_ec2_profile"
  role = aws_iam_role.prometheus_discovery_role.name
}
