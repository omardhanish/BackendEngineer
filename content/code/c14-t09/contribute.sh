git init -b main project
cd project
echo "# Tool" > README.md
git add README.md
git commit -m "Add README"
cd ..
git clone --bare project upstream.git
git clone --bare upstream.git fork.git
git clone fork.git mine
cd mine
git remote add upstream ../upstream.git
git remote -v
git switch -c fix-readme
echo "A small command-line tool." >> README.md
git commit -am "Describe the tool"
git push -u origin fix-readme
cd ../project
echo "MIT" > LICENSE
git add LICENSE
git commit -m "Add license"
git push ../upstream.git main
cd ../mine
git fetch upstream
git switch main
git merge --ff-only upstream/main
git push origin main
