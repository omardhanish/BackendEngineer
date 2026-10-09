docker build -t bookstore-api .
docker run -d --name api -p 3000:3000 bookstore-api
curl http://localhost:3000/books
