docker build -t bookstore-api:1.0 .
# edit src/routes.js, then build again
docker build -t bookstore-api:1.0 .
docker build --no-cache -t bookstore-api:1.0 .
