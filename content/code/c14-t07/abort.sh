mkdir menu
cd menu
git init -b main
echo "soup: 5" > menu.txt
git add menu.txt
git commit -m "Add menu"
git switch -c cheaper
echo "soup: 4" > menu.txt
git commit -am "Lower soup price"
git switch main
echo "soup: 6" > menu.txt
git commit -am "Raise soup price"
git switch cheaper
git rebase main
git rebase --abort
git log --oneline
