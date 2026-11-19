resource "aws_sqs_queue" "measurements" {
  name                       = "${var.project}-measurements"
  visibility_timeout_seconds = 120
  message_retention_seconds  = 86400
  sqs_managed_sse_enabled    = true
}