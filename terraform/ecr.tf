resource "aws_ecr_repository" "app" {
  name         = "cloud-lab1-api"
  force_delete = true

  image_scanning_configuration {
    scan_on_push = true
  }
}