mkdir site
cd site
git init -b main
echo "home" > index.txt
git add index.txt
git commit -m "Add home page"
git switch -c about
echo "about" > about.txt
git add about.txt
git commit -m "Add about page"
echo "team" > team.txt
git add team.txt
git commit -m "Add team page"
git switch main
echo "contact" > contact.txt
git add contact.txt
git commit -m "Add contact page"
git log --oneline --graph --all --decorate
git switch about
git rebase main
git log --oneline --graph --all --decorate
git switch main
git merge about
