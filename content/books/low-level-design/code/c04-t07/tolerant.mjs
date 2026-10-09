// An old client: reads the fields it knows, ignores the rest.
function readOrder(json) {
  const { id, total = 0 } = JSON.parse(json);
  return `order ${id} costs ${total}`;
}
console.log(readOrder('{"id":42,"total":12.5}'));
console.log(readOrder('{"id":42,"total":12.5,"points":3}')); // added: safe
console.log(readOrder('{"id":42}')); // removed: no crash, but a wrong answer
