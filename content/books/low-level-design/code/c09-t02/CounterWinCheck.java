public class CounterWinCheck {
    public static void main(String[] args) {
        WinTracker t = new WinTracker(4);            // 4x4: four in a row
        int[][] moves = { {0, 3}, {0, 0}, {1, 2}, {1, 1}, {2, 1}, {2, 2} };
        for (int i = 0; i < moves.length; i++) {
            int sign = i % 2 == 0 ? +1 : -1;         // X = +1, O = -1
            boolean won = t.apply(moves[i][0], moves[i][1], sign);
            System.out.println((sign > 0 ? "X" : "O") + " at "
                    + moves[i][0] + "," + moves[i][1] + " wins? " + won);
        }
        System.out.println("X at 3,0 wins? " + t.apply(3, 0, +1));
        t.undo(3, 0, +1);                            // extension: undo
        System.out.println("after undo, O at 3,3 wins? " + t.apply(3, 3, -1));
    }
}

final class WinTracker {
    private final int n;
    private final int[] rows, cols;
    private int diag, anti;

    WinTracker(int n) {
        if (n < 3) throw new IllegalArgumentException("n must be >= 3");
        this.n = n;
        this.rows = new int[n];
        this.cols = new int[n];
    }

    /** Records a legal move; O(1) time. Returns true if it wins. */
    boolean apply(int r, int c, int sign) {
        add(r, c, sign);
        return Math.abs(rows[r]) == n || Math.abs(cols[c]) == n
                || Math.abs(diag) == n || Math.abs(anti) == n;
    }

    void undo(int r, int c, int sign) { add(r, c, -sign); }

    private void add(int r, int c, int delta) {
        rows[r] += delta;
        cols[c] += delta;
        if (r == c) diag += delta;
        if (r + c == n - 1) anti += delta;
    }
}
