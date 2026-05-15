# ==============================================================================
# NETWORK CONFIGURATION (CUSTOM VPC)
# ==============================================================================

provider "aws" {
  region = var.aws_region
}

# Lấy danh sách các Availability Zones có sẵn trong Region (ví dụ: ap-southeast-1a, 1b, 1c)
data "aws_availability_zones" "available" {
  state = "available"
}

# 1. Tạo Custom VPC
resource "aws_vpc" "main_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "secondhand-land-vpc" }
}

# 2. Tạo Internet Gateway để VPC ra được Internet
resource "aws_internet_gateway" "main_igw" {
  vpc_id = aws_vpc.main_vpc.id
  tags = { Name = "secondhand-land-igw" }
}

# 3. Tạo 2 Public Subnets ở 2 Availability Zones khác nhau (BẮT BUỘC cho ALB)
resource "aws_subnet" "public_subnet_1" {
  vpc_id                  = aws_vpc.main_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true # Tự động cấp Public IP cho máy ảo
  tags = { Name = "cloud-public-subnet-1" }
}

resource "aws_subnet" "public_subnet_2" {
  vpc_id                  = aws_vpc.main_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true
  tags = { Name = "cloud-public-subnet-2" }
}

# 4. Tạo Route Table định tuyến ra Internet
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main_vpc.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main_igw.id
  }
  tags = { Name = "cloud-public-rt" }
}

# 5. Gắn Route Table vào 2 Subnets
resource "aws_route_table_association" "public_rta_1" {
  subnet_id      = aws_subnet.public_subnet_1.id
  route_table_id = aws_route_table.public_rt.id
}
resource "aws_route_table_association" "public_rta_2" {
  subnet_id      = aws_subnet.public_subnet_2.id
  route_table_id = aws_route_table.public_rt.id
}

# Lấy danh sách AMI Ubuntu 22.04 LTS mới nhất
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}
