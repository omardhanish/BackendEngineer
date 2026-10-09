function onlyAllowed(items, allowed) {
  return items.every((item) => allowed.includes(item));
}
