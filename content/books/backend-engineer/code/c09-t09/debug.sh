docker ps -a
docker logs -f --tail 20 api
docker exec -it api sh
docker inspect --format '{{.State.ExitCode}}' api
docker stats --no-stream api
docker restart api
docker stop api
docker rm api
