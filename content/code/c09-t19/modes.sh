docker run -d --name api --network host bookstore-api
curl http://localhost:3000/books
docker run --rm --network none alpine ip addr show
