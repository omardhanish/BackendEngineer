aws elbv2 describe-target-health --target-group-arn <target-group-arn>

aws ecs describe-services --cluster <cluster> --services <service> \
  --query 'services[0].events[:3].message'

aws ecs list-tasks --cluster <cluster> --service-name <service> \
  --desired-status STOPPED

aws ecs describe-tasks --cluster <cluster> --tasks <task-id> \
  --query 'tasks[0].stoppedReason'

aws elbv2 modify-target-group --target-group-arn <target-group-arn> \
  --health-check-path /health
