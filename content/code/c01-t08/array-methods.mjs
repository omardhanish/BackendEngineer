const nums = [3, 8, 5, 10];
const show = (label, v) => console.log(label, JSON.stringify(v));
show('map', nums.map((n) => n * 2));
show('filter', nums.filter((n) => n > 4));
show('reduce', nums.reduce((total, n) => total + n, 0));
show('find', nums.find((n) => n > 4));
show('some, every', [nums.some((n) => n > 9), nums.every((n) => n > 9)]);
show('includes', nums.includes(5));
show('slice', nums.slice(1, 3));
show('sort', [...nums].sort((a, b) => a - b));   // copy first: sort changes it
show('flat', [[1, 2], [3]].flat());
show('spread', [...nums, 99]);
console.log('original', nums.join());
