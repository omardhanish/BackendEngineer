git init --bare remote.git
mkdir app
cd app
git init -b main
echo "hello" > app.txt
git add app.txt
git commit -m "Add app"
git remote add origin ../remote.git
git remote -v
git push -u origin main
cd ..
git clone remote.git teammate
cd teammate
echo "docs" >> app.txt
git commit -am "Add docs line"
git push
cd ../app
echo "tests" > tests.txt
git add tests.txt
git commit -m "Add tests"
git push
git fetch
git status -sb
git merge origin/main
git push
