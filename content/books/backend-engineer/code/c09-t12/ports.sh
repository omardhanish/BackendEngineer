docker run -d --name shop-a -p 8080:3000 shop
docker run -d --name shop-b -p 8081:3000 shop
curl http://localhost:8080
curl http://localhost:8081
docker port shop-a
