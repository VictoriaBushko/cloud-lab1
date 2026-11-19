resource "aws_sqs_queue" "dead_letter" {
  name                      = "${var.project}-measurements-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "measurements" {
  name                       = "${var.project}-measurements"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dead_letter.arn
    maxReceiveCount     = 3
  })
}

output "dlq_url" {
  value = aws_sqs_queue.dead_letter.url
}