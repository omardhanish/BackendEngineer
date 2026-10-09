public class TicTacToeDemo {
    public static void main(String[] args) {
        Game game = new Game(3);
        int[][] moves = {{0, 0}, {1, 1}, {0, 1}, {2, 2}, {1, 1}, {0, 2},
                         {2, 0}};
        for (int[] m : moves) {
            try {
                System.out.println(game.play(m[0], m[1]));
            } catch (IllegalStateException e) {
                System.out.println("rejected: " + e.getMessage());
            }
        }
    }
}

enum Mark { X, O }
enum Status { PLAYING, X_WON, O_WON, DRAW }

final class Game {
    private final int n;
    private final Mark[][] cells;
    private final int[] lines; // n rows, n columns, 2 diagonals; X +1, O -1
    private int moves;
    private Mark turn = Mark.X;
    private Status status = Status.PLAYING;

    Game(int n) {
        this.n = n;
        cells = new Mark[n][n];
        lines = new int[2 * n + 2];
    }

    String play(int r, int c) {
        if (status != Status.PLAYING) throw new IllegalStateException("over");
        if (cells[r][c] != null) throw new IllegalStateException("taken");
        cells[r][c] = turn;
        moves++;
        int d = turn == Mark.X ? 1 : -1;
        lines[r] += d;
        lines[n + c] += d;
        if (r == c) lines[2 * n] += d;
        if (r + c == n - 1) lines[2 * n + 1] += d;
        boolean won = Math.abs(lines[r]) == n
                || Math.abs(lines[n + c]) == n
                || Math.abs(lines[2 * n]) == n
                || Math.abs(lines[2 * n + 1]) == n;
        if (won) {
            status = turn == Mark.X ? Status.X_WON : Status.O_WON;
        } else if (moves == n * n) status = Status.DRAW;
        String line = turn + " at " + r + "," + c + " -> " + status;
        turn = turn == Mark.X ? Mark.O : Mark.X;
        return line;
    }
}
