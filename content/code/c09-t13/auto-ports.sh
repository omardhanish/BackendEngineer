docker run -d -P --name api-1 bookstore-api
docker run -d -P --name api-2 bookstore-api
docker port api-1
docker port api-2 3000
docker ps --format "{{.Names}} {{.Ports}}"
docker run -d -p 3000 --name api-3 bookstore-api
