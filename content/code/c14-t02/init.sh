mkdir notes
cd notes
echo "# Notes" > README.md
git init -b main
ls -A
ls -A .git
cat .git/HEAD
git status
git log
mkdir sub
cd sub
git rev-parse --show-toplevel
