npm install drizzle-orm pg dotenv
npm install -D drizzle-kit
cat > .env <<'EOT'
DATABASE_URL=postgres://postgres:demo-password@localhost:5432/postgres
EOT
echo ".env" >> .gitignore
