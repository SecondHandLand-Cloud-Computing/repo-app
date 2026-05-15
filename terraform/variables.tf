# Chứa Token, Image ID, Instance Type

variable "aws_region" {
    default = "ap-southeast-1" # Singapore
}

# mongoDB
variable "mongo_uri" {
    description = "MongoDB connection string"
    type       = string
    sensitive  = true 
}

# link toi github
 variable "repo_app_url" {
    default = "https://github.com/SecondHandLand-Cloud-Computing/repo-app.git"
 }
 variable "monitor_url" {
    default = "https://github.com/SecondHandLand-Cloud-Computing/monitoring.git"
 }

 # jwt
 variable "jwt_secret" {
    description = "jwt secret key"
    type = string
    sensitive = true
 }
