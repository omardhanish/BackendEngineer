import java.util.List;
import java.util.Objects;

public class TicTacToeModel {
    public static void main(String[] args) {
        Game game = new Game(3, new Player("Asha", Symbol.X),
                new Player("Ben", Symbol.O));
        for (Move m : List.of(new Move(0, 0), new Move(1, 1),
                new Move(1, 1), new Move(3, 0), new Move(2, 2))) {
            try {
                game.play(m);
                System.out.println("ok       " + m);
            } catch (IllegalArgumentException e) {
                System.out.println("rejected " + m + ": " + e.getMessage());
            }
        }
        System.out.print(game.board());
        System.out.println("next: " + game.current().name());
    }
}

enum Symbol { X, O }
record Player(String name, Symbol symbol) {
    Player { Objects.requireNonNull(name); Objects.requireNonNull(symbol); }
}
record Move(int row, int col) {}

final class Game {
    private final Symbol[][] cells;         // the board, owned by Game
    private final List<Player> players;
    private int turn;                       // index into players

    Game(int size, Player first, Player second) {
        if (size < 3) throw new IllegalArgumentException("size must be >= 3");
        if (first.symbol() == second.symbol())
            throw new IllegalArgumentException("players need two symbols");
        this.cells = new Symbol[size][size];
        this.players = List.of(first, second);
    }
    Player current() { return players.get(turn); }

    void play(Move m) {
        int n = cells.length;
        boolean inside = m.row() >= 0 && m.row() < n
                && m.col() >= 0 && m.col() < n;
        if (!inside) throw new IllegalArgumentException("off the board");
        if (cells[m.row()][m.col()] != null) throw new IllegalArgumentException(
                "cell taken");
        cells[m.row()][m.col()] = current().symbol();
        turn = 1 - turn;                    // only a legal move passes turn
    }
    String board() {                        // a copy as text, never the array
        StringBuilder sb = new StringBuilder();
        for (Symbol[] row : cells) {
            for (Symbol s : row) sb.append(s == null ? "." : s.name());
            sb.append('\n');
        }
        return sb.toString();
    }
}
