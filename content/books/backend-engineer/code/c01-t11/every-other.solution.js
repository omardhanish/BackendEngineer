function everyOther(items) {
  const picked = [];
  for (let i = 0; i < items.length; i += 2) {
    picked.push(items[i]);
  }
  return picked;
}
