echo "DB_PASSWORD=demo-password" > .env
docker compose up -d --build
docker compose ps
docker compose logs api
docker compose down
