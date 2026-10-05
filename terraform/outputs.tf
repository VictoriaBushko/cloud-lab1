output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}
output "app_url" {
  value = "http://${aws_lb.main.dns_name}"
}