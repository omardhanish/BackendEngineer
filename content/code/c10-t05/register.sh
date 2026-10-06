aws ecs register-task-definition --cli-input-json file://taskdef.json
aws ecs list-task-definitions --family-prefix bookstore-api
