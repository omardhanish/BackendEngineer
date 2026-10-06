docker run -d --name api --env-file .env bookstore-api
docker exec api whoami
docker exec api touch /app/x
