aws elbv2 create-target-group --name bookstore-api --protocol HTTP \
  --port 3000 --vpc-id <vpc-id> --target-type ip \
  --health-check-path /health
aws ecs create-service --cli-input-json file://service.json
aws ecs describe-services --cluster <cluster> --services <service> \
  --query 'services[0].[runningCount,desiredCount]'
