resource "terraform_data" "initial_image" {
  triggers_replace = aws_ecr_repository.app.repository_url

  provisioner "local-exec" {
    command = <<-EOT
      aws ecr get-login-password --region ${var.region} | docker login --username AWS --password-stdin ${split("/", aws_ecr_repository.app.repository_url)[0]}
      docker build --platform linux/amd64 -t ${aws_ecr_repository.app.repository_url}:v1 ${path.module}/..
      docker push ${aws_ecr_repository.app.repository_url}:v1
    EOT
  }
}