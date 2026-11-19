output "ingest_url" {
  value = "${aws_apigatewayv2_api.ingest.api_endpoint}/ingest"
}

output "queue_url" {
  value = aws_sqs_queue.measurements.url
}

output "api_key" {
  value     = random_password.api_key.result
  sensitive = true
}