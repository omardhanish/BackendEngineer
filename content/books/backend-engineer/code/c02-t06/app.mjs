import dotenv from 'dotenv';

const settings = dotenv.parse('MODE=dev\nRETRIES=3');
console.log(settings);
