data "archive_file" "worker" {
  type        = "zip"
  source_dir  = "${path.module}/../functions/worker"
  output_path = "${path.module}/build/worker.zip"
}

resource "aws_iam_role" "worker" {
  name               = "${var.project}-worker"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "worker_vpc" {
  role       = aws_iam_role.worker.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

data "aws_iam_policy_document" "worker" {
  statement {
    actions   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
    resources = [aws_sqs_queue.measurements.arn]
  }

  statement {
    actions   = ["dynamodb:PutItem", "dynamodb:Query"]
    resources = [aws_dynamodb_table.raw.arn]
  }

  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.images.arn}/images/*"]
  }
}

resource "aws_iam_role_policy" "worker" {
  name   = "worker"
  role   = aws_iam_role.worker.id
  policy = data.aws_iam_policy_document.worker.json
}

resource "aws_cloudwatch_log_group" "processor" {
  name              = "/aws/lambda/${var.project}-processor"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "history" {
  name              = "/aws/lambda/${var.project}-history"
  retention_in_days = 7
}

resource "aws_lambda_function" "processor" {
  function_name    = "${var.project}-processor"
  role             = aws_iam_role.worker.arn
  runtime          = "nodejs22.x"
  handler          = "processor.handler"
  filename         = data.archive_file.worker.output_path
  source_code_hash = data.archive_file.worker.output_base64sha256
  timeout          = 20
  memory_size      = 256

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      DB_HOST       = aws_db_instance.main.address
      DB_USER       = aws_db_instance.main.username
      DB_PASSWORD   = random_password.db.result
      DB_NAME       = aws_db_instance.main.db_name
      RAW_TABLE     = aws_dynamodb_table.raw.name
      IMAGES_BUCKET = aws_s3_bucket.images.bucket
    }
  }

  depends_on = [aws_cloudwatch_log_group.processor, aws_iam_role_policy_attachment.worker_vpc]
}

resource "aws_lambda_event_source_mapping" "processor" {
  event_source_arn                   = aws_sqs_queue.measurements.arn
  function_name                      = aws_lambda_function.processor.arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 1
  function_response_types            = ["ReportBatchItemFailures"]

  scaling_config {
    maximum_concurrency = 5
  }

  depends_on = [aws_iam_role_policy.worker]
}

resource "aws_lambda_function" "history" {
  function_name    = "${var.project}-history"
  role             = aws_iam_role.worker.arn
  runtime          = "nodejs22.x"
  handler          = "history.handler"
  filename         = data.archive_file.worker.output_path
  source_code_hash = data.archive_file.worker.output_base64sha256
  timeout          = 10
  memory_size      = 256

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      DB_HOST       = aws_db_instance.main.address
      DB_USER       = aws_db_instance.main.username
      DB_PASSWORD   = random_password.db.result
      DB_NAME       = aws_db_instance.main.db_name
      API_KEY       = random_password.api_key.result
      RAW_TABLE     = aws_dynamodb_table.raw.name
      IMAGES_BUCKET = aws_s3_bucket.images.bucket
    }
  }

  depends_on = [aws_cloudwatch_log_group.history, aws_iam_role_policy_attachment.worker_vpc]
}

resource "aws_apigatewayv2_integration" "history" {
  api_id                 = aws_apigatewayv2_api.ingest.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.history.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "history" {
  api_id    = aws_apigatewayv2_api.ingest.id
  route_key = "GET /sensors/{sensor_id}/history"
  target    = "integrations/${aws_apigatewayv2_integration.history.id}"
}

resource "aws_lambda_permission" "apigw_history" {
  statement_id  = "AllowApiGatewayHistory"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.history.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ingest.execution_arn}/*/*"
}