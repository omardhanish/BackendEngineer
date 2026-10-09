docker run -d --name api bookstore-api
docker run -dit --name tool alpine ash
docker network inspect bridge
docker exec tool wget -qO- http://<api-ip>:3000/books
docker exec tool wget -qO- http://api:3000/books
