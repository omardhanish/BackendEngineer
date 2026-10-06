function triangle(n) {
  const rows = [];
  for (let i = 1; i <= n; i++) {
    let row = '';
    for (let j = 0; j < i; j++) {
      row += '*';
    }
    rows.push(row);
  }
  return rows;
}
