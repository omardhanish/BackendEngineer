function lastItems(items, n) {
  return items.slice(Math.max(items.length - n, 0));
}
