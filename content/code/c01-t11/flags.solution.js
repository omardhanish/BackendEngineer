function enabledFlags(flags) {
  const names = [];
  for (const key in flags) {
    if (flags[key] === true) {
      names.push(key);
    }
  }
  return names;
}
