public class NaiveTicTacToe {
    public static void main(String[] args) {
        NaiveGame game = new NaiveGame();
        game.play(0, 0);                  // X
        game.play(1, 1);                  // O
        game.play(1, 1);                  // X steals O's cell
        System.out.println("centre is now " + game.cells[1][1]);
        game.cells[2][2] = 'Z';           // any caller can write
        try {
            game.play(3, 0);              // off the board
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("crash: " + e.getClass().getSimpleName());
        }
        for (int r = 0; r < 3; r++) {
            System.out.println(game.row(r));
        }
        System.out.println("next turn: " + game.turn);
    }
}

class NaiveGame {
    char[][] cells = new char[3][3];      // open state, no owner
    char turn = 'X';

    void play(int row, int col) {
        cells[row][col] = turn;           // no rule is checked
        turn = turn == 'X' ? 'O' : 'X';
    }

    String row(int r) {
        StringBuilder sb = new StringBuilder();
        for (char c : cells[r]) {
            sb.append(c == 0 ? '.' : c);
        }
        return sb.toString();
    }
}
