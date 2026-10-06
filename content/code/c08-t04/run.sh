docker run --name url-shortener-db \
  -e POSTGRES_PASSWORD=demo-password \
  -e POSTGRES_DB=shortener \
  -v url-shortener-data:/var/lib/postgresql \
  -p 127.0.0.1:5432:5432 \
  -d postgres:18
docker ps
docker stop url-shortener-db
docker start url-shortener-db
