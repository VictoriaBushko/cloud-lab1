resource "aws_dynamodb_table" "raw" {
  name         = "${var.project}-raw-measurements"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "sensor_id"
  range_key    = "measured_at"

  attribute {
    name = "sensor_id"
    type = "S"
  }

  attribute {
    name = "measured_at"
    type = "S"
  }
}

output "raw_table" {
  value = aws_dynamodb_table.raw.name
}