import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.List;
import java.util.Queue;

public class GameLoopDemo {
    public static void main(String[] args) {
        Queue<Move> script = new ArrayDeque<>(List.of(
                new Move(0, 0), new Move(1, 1), new Move(2, 2)));
        MoveStrategy asha = board -> script.remove();   // stands in for a human
        Game game = new Game(3, asha, new FirstFreeBot());
        System.out.println("result: " + game.run());
    }
}

enum Symbol { X, O }
enum Status { X_WON, O_WON, DRAW }
record Move(int row, int col) {}
interface MoveStrategy { Move next(Symbol[][] boardCopy); }

class FirstFreeBot implements MoveStrategy {     // simplest possible AI
    public Move next(Symbol[][] b) {
        for (int r = 0; r < b.length; r++)
            for (int c = 0; c < b.length; c++)
                if (b[r][c] == null) return new Move(r, c);
        throw new IllegalStateException("no free cell");
    }
}

final class Game {
    private final Symbol[][] cells;
    private final List<MoveStrategy> players;
    private int moves;
    Game(int n, MoveStrategy x, MoveStrategy o) {
        cells = new Symbol[n][n];
        players = List.of(x, o);
    }
    Status run() {
        while (true) {
            Symbol me = Symbol.values()[moves % 2];
            Symbol[][] copy = Arrays.stream(cells)
                    .map(Symbol[]::clone).toArray(Symbol[][]::new);
            Move m = players.get(moves % 2).next(copy);
            cells[m.row()][m.col()] = me;   // rule checks: last page
            moves++;
            System.out.println(me + " -> " + m);
            if (wins(m, me)) return Status.valueOf(me + "_WON");
            if (moves == cells.length * cells.length) return Status.DRAW;
        }
    }
    private boolean wins(Move m, Symbol s) {     // only lines through m
        int n = cells.length;
        boolean row = true, col = true;
        boolean diag = m.row() == m.col(), anti = m.row() + m.col() == n - 1;
        for (int i = 0; i < n; i++) {
            row &= cells[m.row()][i] == s;
            col &= cells[i][m.col()] == s;
            diag &= cells[i][i] == s;
            anti &= cells[i][n - 1 - i] == s;
        }
        return row || col || diag || anti;
    }
}
