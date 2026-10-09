mkdir shop
cd shop
git init -b main
echo "# Shop" > README.md
git add README.md
git status --short
git commit -m "Add README"
echo "const port = 3000;" > app.js
git add app.js
git commit -m "Add app.js"
echo "const port = 4000;" > app.js
git add app.js
git commit -m "Change port"
git log --oneline
git log -1
