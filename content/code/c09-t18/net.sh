docker network create bookstore-net
docker run -d --name api --network bookstore-net bookstore-api
docker run --rm --network bookstore-net alpine ping -c 1 api
docker run -dit --name job alpine ash
docker exec job ping -c 1 api
docker network connect bookstore-net job
docker exec job ping -c 1 api
