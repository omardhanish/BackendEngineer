docker volume create covers
docker run -d --name api -v covers:/app/covers bookstore-api
docker rm -f api
docker run -d --name api -v covers:/app/covers bookstore-api
docker volume ls
docker volume inspect covers
