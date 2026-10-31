locals {
  lb_dim = aws_lb.main.arn_suffix
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = var.project

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Кількість екземплярів"
          region = var.region
          view   = "timeSeries"
          period = 60
          stat   = "Average"
          metrics = [
            ["ECS/ContainerInsights", "DesiredTaskCount", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.app.name],
            ["ECS/ContainerInsights", "RunningTaskCount", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.app.name]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "CPU сервісу, %"
          region  = var.region
          view    = "timeSeries"
          period  = 60
          stat    = "Average"
          metrics = [["AWS/ECS", "CPUUtilization", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.app.name]]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "Запити за хвилину"
          region  = var.region
          view    = "timeSeries"
          period  = 60
          stat    = "Sum"
          metrics = [["AWS/ApplicationELB", "RequestCount", "LoadBalancer", local.lb_dim]]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "Затримка p95, с"
          region  = var.region
          view    = "timeSeries"
          period  = 60
          stat    = "p95"
          metrics = [["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", local.lb_dim]]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "Помилки 5xx"
          region = var.region
          view   = "timeSeries"
          period = 60
          stat   = "Sum"
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", local.lb_dim],
            ["AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count", "LoadBalancer", local.lb_dim]
          ]
        }
      }
    ]
  })
}