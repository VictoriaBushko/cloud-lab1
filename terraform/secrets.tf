resource "aws_secretsmanager_secret" "db_password" {
  name                    = "cloud-lab1/db-password"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db.result
}

data "aws_iam_policy_document" "read_db_secret" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.db_password.arn]
  }
}

resource "aws_iam_role_policy" "task_execution_secrets" {
  name   = "read-db-secret"
  role   = aws_iam_role.task_execution.id
  policy = data.aws_iam_policy_document.read_db_secret.json
}