function pairs(items) {
  const result = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      result.push([items[i], items[j]]);
    }
  }
  return result;
}
