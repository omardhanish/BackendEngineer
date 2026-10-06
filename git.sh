mkdir auth-backend
cd auth-backend
git init -b main
mkdir node_modules
touch node_modules/pkg.js
echo 'ACCESS_TOKEN_SECRET=demo-secret' > .env
echo '{ "name": "auth-backend" }' > package.json
git status --short
cat > .gitignore <<'EOF'
node_modules/
.env
