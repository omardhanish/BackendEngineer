const temp = 18;
if (temp >= 30) console.log('hot');
else if (temp >= 15) console.log('mild');
else console.log('cold');

const day = 'sat';
switch (day) {
  case 'sat':
  case 'sun':
    console.log('weekend');
    break;
  default:
    console.log('weekday');
}
