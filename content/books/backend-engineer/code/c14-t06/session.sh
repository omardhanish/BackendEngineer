git init shop
cd shop
echo "price = 10" > app.txt
git add app.txt
git commit -m "Add price"
echo "price = 12" > app.txt
git diff
git add app.txt
git diff --staged
git stash
git status --short
git stash list
git stash pop
git status --short
