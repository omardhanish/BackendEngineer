docker run -d --name api -p 3000:3000 \
  --mount type=bind,source="$(pwd)",target=/app \
  bookstore-api
docker restart api
docker run -d --name viewer -p 3001:3000 \
  -v "$(pwd)":/app:ro \
  bookstore-api
