mkdir demo
cd demo
git init -b main
echo "# Demo" > README.md
git add README.md
git commit -m "Add README"
mkdir src
echo "console.log('hi');" > src/app.js
git add src
git commit -m "Add app"
git cat-file -t HEAD
git cat-file -p HEAD
git cat-file -p 'HEAD^{tree}'
git cat-file -p HEAD:README.md
git rev-parse HEAD~1:README.md HEAD:README.md
