package problems;

/**
 * MATRIX LOOPING CHEAT SHEET
 *
 * Golden rule: for every pattern, ask 3 questions
 *   1. Which cells do I want?        (all / border / diagonal / triangle ...)
 *   2. What is the RELATION between row (r) and col (c) for those cells?
 *   3. Which loop variable is free, and which one is derived from the relation?
 *
 * Let  R = rows = m.length,  C = cols = m[0].length
 *
 * Useful relations:
 *   main diagonal       r == c
 *   anti diagonal       r + c == C - 1
 *   same "\" diagonal   r - c is constant
 *   same "/" diagonal   r + c is constant
 *   upper triangle      c > r      lower triangle  c < r
 *   1D index <-> 2D     r = idx / C,  c = idx % C,  idx = r * C + c
 */
public class CodePractice {

    static int[][] m = {
            { 1,  2,  3,  4},
            { 5,  6,  7,  8},
            { 9, 10, 11, 12},
            {13, 14, 15, 16}
    };
    static int R = m.length, C = m[0].length;

    public static void main(String[] args) {
        //System.out.println("1. Row by row");           rowWise();
        // System.out.println("2. Column by column");     colWise();
        //System.out.println("3. Reverse");              reverse();
        // System.out.println("4. Snake / zigzag");       snake();
        // System.out.println("5. Main diagonal");        mainDiagonal();
        // System.out.println("6. Anti diagonal");        antiDiagonal();
        // System.out.println("7. All '\\' diagonals");    allDiagonalsBackslash();
        // System.out.println("8. All '/' diagonals");     allDiagonalsSlash();
        // System.out.println("9. Upper triangle");       upperTriangle();
        // System.out.println("10. Lower triangle");      lowerTriangle();
        // System.out.println("11. Border only");         border();
         System.out.println("12. Spiral");              spiral();
        // System.out.println("13. Layer by layer");      layers();
        // System.out.println("14. Neighbours (4 dir)");  neighbours(1, 1);
        // System.out.println("15. Flat index trick");    flatIndex();
        // System.out.println("16. Transpose + rotate");  transposeAndRotate();
    }

    // 1. ROW-WISE: outer = row, inner = col. The default pattern.
    static void rowWise() {
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++)
                System.out.print(m[r][c] + " ");
        System.out.println();
    }

    // 2. COLUMN-WISE: just swap the loops. Outer = col, inner = row.
    //    Still access m[r][c] -- only the loop ORDER changes.
    static void colWise() {
        for (int c = 0; c < C; c++)
            for (int r = 0; r < R; r++)
                System.out.print(m[r][c] + " ");
        System.out.println();
    }

    // 3. REVERSE: count down instead of up.
    static void reverse() {
        for (int r = R - 1; r >= 0; r--)
            for (int c = C - 1; c >= 0; c--)
                System.out.print(m[r][c] + " ");
        System.out.println();
    }

    // 4. SNAKE: even rows go left->right, odd rows go right->left.
    static void snake() {
        for (int r = 0; r < R; r++) {
            if (r % 2 == 0) for (int c = 0; c < C; c++)      System.out.print(m[r][c] + " ");
            else            for (int c = C - 1; c >= 0; c--) System.out.print(m[r][c] + " ");
        }
        System.out.println();
    }

    // 5. MAIN DIAGONAL (r == c): ONE loop, c is the same as r.
    static void mainDiagonal() {
        for (int i = 0; i < Math.min(R, C); i++)
            System.out.print(m[i][i] + " ");
        System.out.println();
    }

    // 6. ANTI DIAGONAL (r + c == C-1): ONE loop, c is derived from r.
    static void antiDiagonal() {
        for (int r = 0; r < R; r++)
            System.out.print(m[r][C - 1 - r] + " ");
        System.out.println();
    }

    // 7. ALL "\" DIAGONALS: each has constant (c - r). d ranges from -(R-1) to C-1.
    //    Start at the top row / left column and walk down-right until you fall off.
    static void allDiagonalsBackslash() {
        for (int d = -(R - 1); d <= C - 1; d++) {
            int r = Math.max(0, -d);        // start row
            int c = Math.max(0, d);         // start col
            while (r < R && c < C)
                System.out.print(m[r++][c++] + " ");
            System.out.println();
        }
    }

    // 8. ALL "/" DIAGONALS: each has constant (r + c). s ranges 0 .. R+C-2.
    //    Walk r from 0..R-1 and derive c = s - r; keep it only if c is valid.
    static void allDiagonalsSlash() {
        for (int s = 0; s <= R + C - 2; s++) {
            for (int r = 0; r < R; r++) {
                int c = s - r;
                if (c >= 0 && c < C) System.out.print(m[r][c] + " ");
            }
            System.out.println();
        }
    }

    // 9. UPPER TRIANGLE (c > r): inner loop STARTS from r+1.
    static void upperTriangle() {
        for (int r = 0; r < R; r++)
            for (int c = r + 1; c < C; c++)
                System.out.print(m[r][c] + " ");
        System.out.println();
    }

    // 10. LOWER TRIANGLE (c < r): inner loop ENDS before r.
    static void lowerTriangle() {
        for (int r = 0; r < R; r++)
            for (int c = 0; c < r && c < C; c++)
                System.out.print(m[r][c] + " ");
        System.out.println();
    }

    // 11. BORDER: four small straight loops, OR one loop with an if.
    static void border() {
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++)
                if (r == 0 || r == R - 1 || c == 0 || c == C - 1)
                    System.out.print(m[r][c] + " ");
        System.out.println();
    }

    // 12. SPIRAL: keep 4 walls (top, bottom, left, right) and shrink them.
    //     After each side, move that wall inward. Re-check before the 3rd and 4th side
    //     (needed when only one row/col is left).
    static void spiral() {
        int top = 0, bottom = R - 1, left = 0, right = C - 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++)  System.out.print(m[top][c] + " ");     // ->
            top++;
            for (int r = top; r <= bottom; r++)  System.out.print(m[r][right] + " ");   // down
            right--;
            if (top <= bottom) {
                for (int c = right; c >= left; c--) System.out.print(m[bottom][c] + " "); // <-
                bottom--;
            }
            if (left <= right) {
                for (int r = bottom; r >= top; r--) System.out.print(m[r][left] + " ");   // up
                left++;
            }
        }
        System.out.println();
    }

    // 13. LAYERS (rings): layer k is the border of the sub-matrix starting at (k,k).
    //     Number of layers = min(R, C) / 2 (square matrix: n/2). Used in rotate-in-place.
    static void layers() {
        for (int k = 0; k < Math.min(R, C) / 2; k++) {
            int lo = k, hiR = R - 1 - k, hiC = C - 1 - k;
            System.out.print("layer " + k + ": ");
            for (int c = lo; c <= hiC; c++)      System.out.print(m[lo][c] + " ");
            for (int r = lo + 1; r <= hiR; r++)  System.out.print(m[r][hiC] + " ");
            for (int c = hiC - 1; c >= lo; c--)  System.out.print(m[hiR][c] + " ");
            for (int r = hiR - 1; r > lo; r--)   System.out.print(m[r][lo] + " ");
            System.out.println();
        }
    }

    // 14. NEIGHBOURS: a direction array replaces 4 (or 8) copy-pasted if-blocks.
    //     ALWAYS bounds-check the new cell. (Used in flood fill, islands, BFS/DFS on grids.)
    static final int[] DR = {-1, 1, 0, 0};   // up, down, left, right
    static final int[] DC = { 0, 0, -1, 1};
    // 8 directions: DR8 = {-1,-1,-1,0,0,1,1,1}, DC8 = {-1,0,1,-1,1,-1,0,1}

    static void neighbours(int r, int c) {
        for (int d = 0; d < 4; d++) {
            int nr = r + DR[d], nc = c + DC[d];
            if (nr >= 0 && nr < R && nc >= 0 && nc < C)
                System.out.print(m[nr][nc] + " ");
        }
        System.out.println();
    }

    // 15. FLAT INDEX: treat the matrix as ONE loop of R*C items. Handy for binary search
    //     on a sorted matrix, or when you just need "every cell".
    static void flatIndex() {
        for (int idx = 0; idx < R * C; idx++)
            System.out.print(m[idx / C][idx % C] + " ");
        System.out.println();
    }

    // 16. TRANSPOSE (swap across the main diagonal -> only visit the upper triangle!)
    //     ROTATE 90 clockwise = transpose, then reverse every row.
    static void transposeAndRotate() {
        int n = R;                                    // square matrix only
        int[][] t = new int[n][n];
        for (int r = 0; r < n; r++)
            for (int c = 0; c < n; c++)
                t[r][c] = m[r][c];

        for (int r = 0; r < n; r++)
            for (int c = r + 1; c < n; c++) {         // upper triangle: avoids double swapping
                int tmp = t[r][c]; t[r][c] = t[c][r]; t[c][r] = tmp;
            }
        for (int r = 0; r < n; r++)
            for (int lo = 0, hi = n - 1; lo < hi; lo++, hi--) {
                int tmp = t[r][lo]; t[r][lo] = t[r][hi]; t[r][hi] = tmp;
            }
        System.out.println(java.util.Arrays.deepToString(t));
    }
}
