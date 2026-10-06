mkdir auth-backend
cd auth-backend
mkdir -p src/{controllers,db,middlewares,models,routes,utils,validators}
touch src/{index,app,constants}.js src/db/index.js src/validators/index.js
touch src/models/user.models.js
touch src/controllers/{healthcheck,auth}.controllers.js
touch src/routes/{healthcheck,auth}.routes.js
touch src/middlewares/{auth,validator}.middlewares.js
touch src/utils/{api-response,api-error,async-handler,mail}.js
find src -type f | sort
