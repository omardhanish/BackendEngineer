# Replace $PORT with the port your server listens on.

# GET is the default method. -i prints the status line and headers too.
curl -i http://localhost:$PORT/notes

# -X picks another method.
curl -i -X DELETE http://localhost:$PORT/notes/1

# -v also shows the request that curl sent.
curl -v http://localhost:$PORT/notes
