aws ecs delete-service --cluster <cluster> --service <service> --force
aws ecs wait services-inactive --cluster <cluster> --services <service>
aws ecs delete-cluster --cluster <cluster>
aws elbv2 delete-load-balancer --load-balancer-arn <load-balancer-arn>
aws elbv2 delete-target-group --target-group-arn <target-group-arn>
aws ecr delete-repository --repository-name bookstore-api --force
aws logs delete-log-group --log-group-name /ecs/bookstore-api
