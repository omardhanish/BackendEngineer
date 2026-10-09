aws ecr create-repository \
  --repository-name bookstore-api \
  --image-tag-mutability IMMUTABLE \
  --region <region>
aws ecr get-login-password --region <region> | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.<region>.amazonaws.com
docker tag bookstore-api:1.0 \
  <account-id>.dkr.ecr.<region>.amazonaws.com/bookstore-api:1.0
docker push \
  <account-id>.dkr.ecr.<region>.amazonaws.com/bookstore-api:1.0
