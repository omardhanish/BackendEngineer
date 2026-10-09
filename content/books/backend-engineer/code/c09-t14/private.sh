echo "$REGISTRY_TOKEN" | \
  docker login registry.example.com -u ci-user --password-stdin
docker tag bookstore-api:1.0 registry.example.com/shop/bookstore-api:1.0
docker push registry.example.com/shop/bookstore-api:1.0
