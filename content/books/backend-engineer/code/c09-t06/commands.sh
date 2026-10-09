docker --help
docker build -t bookstore-api .
docker run -d --name api -p 3000:3000 bookstore-api
docker ps
docker logs api
docker stop api
docker rm api
docker image ls
