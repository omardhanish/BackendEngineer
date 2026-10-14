import java.util.ArrayList;
import java.util.List;

public class NaiveChessBoards {
    public static void main(String[] args) {
        List<Board> boards = new ArrayList<>();
        for (int game = 0; game < 500; game++) boards.add(Board.opening());
        long pieces = 0, spriteBytes = 0;
        for (Board b : boards) {
            for (Piece p : b.pieces()) {
                pieces++;
                spriteBytes += p.spriteSize();
            }
        }
        System.out.println("games: " + boards.size());
        System.out.println("piece objects: " + pieces);
        System.out.println("sprite loads: " + Piece.loads);
        System.out.println("sprite bytes: " + spriteBytes);
    }
}
final class Piece {   // heavy shared-looking data copied into every piece
    static int loads;
    private final String kind, colour, square;
    private final byte[] sprite;
    Piece(String kind, String colour, String square) {
        this.kind = kind; this.colour = colour; this.square = square;
        this.sprite = new byte[4_096];   // pretend: decoded image
        loads++;
    }
    int spriteSize() { return sprite.length; }
}
record Board(List<Piece> pieces) {
    private static final String[] BACK =
        {"rook", "knight", "bishop", "queen", "king", "bishop", "knight",
         "rook"};
    static Board opening() {
        List<Piece> list = new ArrayList<>();
        for (int f = 0; f < 8; f++) {
            String file = String.valueOf((char) ('a' + f));
            list.add(new Piece(BACK[f], "white", file + "1"));
            list.add(new Piece("pawn", "white", file + "2"));
            list.add(new Piece("pawn", "black", file + "7"));
            list.add(new Piece(BACK[f], "black", file + "8"));
        }
        return new Board(List.copyOf(list));
    }
}
