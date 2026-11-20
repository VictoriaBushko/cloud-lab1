data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "images" {
  bucket        = "${var.project}-images-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "images" {
  bucket                  = aws_s3_bucket.images.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "images" {
  bucket = aws_s3_bucket.images.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_iam_role" "upload" {
  name               = "${var.project}-upload"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "upload_logs" {
  role       = aws_iam_role.upload.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "upload" {
  statement {
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.images.arn}/images/*"]
  }
}

resource "aws_iam_role_policy" "upload" {
  name   = "upload"
  role   = aws_iam_role.upload.id
  policy = data.aws_iam_policy_document.upload.json
}

resource "aws_cloudwatch_log_group" "upload" {
  name              = "/aws/lambda/${var.project}-upload"
  retention_in_days = 7
}

resource "aws_lambda_function" "upload" {
  function_name    = "${var.project}-upload"
  role             = aws_iam_role.upload.arn
  runtime          = "nodejs22.x"
  handler          = "upload.handler"
  filename         = data.archive_file.worker.output_path
  source_code_hash = data.archive_file.worker.output_base64sha256
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      IMAGES_BUCKET = aws_s3_bucket.images.bucket
      API_KEY       = random_password.api_key.result
    }
  }

  depends_on = [aws_cloudwatch_log_group.upload, aws_iam_role_policy_attachment.upload_logs]
}

resource "aws_apigatewayv2_integration" "upload" {
  api_id                 = aws_apigatewayv2_api.ingest.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.upload.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "upload" {
  api_id    = aws_apigatewayv2_api.ingest.id
  route_key = "POST /upload-url"
  target    = "integrations/${aws_apigatewayv2_integration.upload.id}"
}

resource "aws_lambda_permission" "apigw_upload" {
  statement_id  = "AllowApiGatewayUpload"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.upload.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ingest.execution_arn}/*/*"
}

output "images_bucket" {
  value = aws_s3_bucket.images.bucket
}