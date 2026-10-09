docker run -d --name api -p 3000:3000 bookstore-api
docker run -d --name api-2 -p 4000:4000 -e PORT=4000 bookstore-api
docker run --rm bookstore-api node --version
docker run --rm -it bookstore-api sh
docker stop api api-2
docker rm api api-2
