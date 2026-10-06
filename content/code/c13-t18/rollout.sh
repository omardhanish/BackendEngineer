kubectl set image deployment/api api=my-api:v2
kubectl rollout status deployment/api
kubectl rollout undo deployment/api
