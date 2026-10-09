console.log(2 + 3 * 4, (2 + 3) * 4);     // * runs first, unless parentheses
console.log('5' + 3, '5' - 3);            // + joins text, - converts to numbers
console.log(5 == '5', 5 === '5');         // == converts types, === does not
console.log(7 % 3, 2 ** 3, 7 / 2);        // remainder, power, division

// falsy: false, 0, 0n, '', null, undefined, NaN. Everything else is truthy.
const port = 0;
console.log(port || 3000, port ?? 3000);  // || replaces 0, ?? keeps it
const user = null;
console.log(user && user.name);           // stops at null: no error
