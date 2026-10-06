docker run --name bookstore-db \
  -e POSTGRES_PASSWORD=demo-password \
  -v bookstore-data:/var/lib/postgresql \
  -p 5432:5432 \
  -d postgres:18
docker ps
export DATABASE_URL=postgres://postgres:demo-password@localhost:5432/postgres
node check.mjs
docker stop bookstore-db
docker start bookstore-db
