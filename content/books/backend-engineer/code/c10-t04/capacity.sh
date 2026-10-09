aws ecs create-cluster \
  --cluster-name <cluster> \
  --capacity-providers FARGATE \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1
