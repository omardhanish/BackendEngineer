class Player {
  constructor(name, mark) { this.name = name; this.mark = mark; }
}
class Board {
  #cells; #counts = new Map();
  constructor(n = 3) { this.n = n; this.#cells = Array(n * n).fill(null); }
  // places a mark and returns true if it completes a line
  place(r, c, mark) {
    const i = r * this.n + c;
    if (Math.min(r, c) < 0 || Math.max(r, c) >= this.n) {
      throw new Error('off the board');
    }
    if (this.#cells[i]) throw new Error(`cell ${r},${c} is taken`);
    this.#cells[i] = mark;
    const lines = [`row${r}`, `col${c}`];
    if (r === c) lines.push('diag');
    if (r + c === this.n - 1) lines.push('anti');
    return lines.map((l) => this.#bump(mark + l)).includes(this.n);
  }
  #bump(key) {
    const v = (this.#counts.get(key) ?? 0) + 1;
    this.#counts.set(key, v);
    return v;
  }
  get full() { return !this.#cells.includes(null); }
}
class Game {
  #board; #players; #turn = 0; status = 'playing';
  constructor(p1, p2, n = 3) {
    this.#players = [p1, p2]; this.#board = new Board(n);
  }
  move(r, c) {
    if (this.status !== 'playing') throw new Error('game is over');
    const p = this.#players[this.#turn];
    if (this.#board.place(r, c, p.mark)) this.status = `${p.name} wins`;
    else if (this.#board.full) this.status = 'draw';
    else this.#turn = 1 - this.#turn;
    return this.status;
  }
}
const game = new Game(new Player('Ana', 'X'), new Player('Ben', 'O'));
const moves = [[1, 1], [0, 0], [1, 1], [0, 2], [0, 1], [2, 0], [2, 2]];
for (const [r, c] of moves) {
  try { console.log(`${r},${c}:`, game.move(r, c)); }
  catch (e) { console.log(`${r},${c}:`, e.message); }
}
