docker build -t bookstore-api:1.0 .
docker tag bookstore-api:1.0 bookstore-api:latest
docker images bookstore-api
docker history bookstore-api:1.0
docker pull node:20-alpine
docker rmi bookstore-api:latest
docker image prune
