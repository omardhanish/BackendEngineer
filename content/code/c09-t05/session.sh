docker build -t shop:1 .
docker run -d --name shop-a shop:1
docker run -d --name shop-b shop:1
docker ps
docker images shop
docker stop shop-a
docker ps -a
