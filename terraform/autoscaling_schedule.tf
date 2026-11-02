resource "aws_appautoscaling_scheduled_action" "day" {
  name               = "cloud-lab1-day"
  service_namespace  = aws_appautoscaling_target.app.service_namespace
  resource_id        = aws_appautoscaling_target.app.resource_id
  scalable_dimension = aws_appautoscaling_target.app.scalable_dimension
  schedule           = "cron(0 6 * * ? *)"

  scalable_target_action {
    min_capacity = 2
    max_capacity = 3
  }
}

resource "aws_appautoscaling_scheduled_action" "night" {
  name               = "cloud-lab1-night"
  service_namespace  = aws_appautoscaling_target.app.service_namespace
  resource_id        = aws_appautoscaling_target.app.resource_id
  scalable_dimension = aws_appautoscaling_target.app.scalable_dimension
  schedule           = "cron(0 18 * * ? *)"

  scalable_target_action {
    min_capacity = 1
    max_capacity = 3
  }
}