import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

public class FlyweightChessDemo {
    public static void main(String[] args) {
        PieceTypes types = new PieceTypes();
        List<List<Placement>> boards = new ArrayList<>();
        for (int game = 0; game < 500; game++) boards.add(opening(types));
        long placements = boards.stream().mapToLong(List::size).sum();
        System.out.println("placements: " + placements);
        System.out.println("shared types: " + types.size());
        Placement a1 = boards.get(0).get(0);
        Placement h1 = boards.get(499).get(28);
        System.out.println(a1.draw() + ", " + h1.draw());
        System.out.println("same type object: " + (a1.type() == h1.type()));
        Integer x = 127, y = 127, big1 = 1000, big2 = 1000;
        System.out.println("JDK cache: " + (x == y) + " " + (big1 == big2));
    }
    static List<Placement> opening(PieceTypes t) {
        String[] back = {"rook", "knight", "bishop", "queen", "king",
                         "bishop", "knight", "rook"};
        List<Placement> list = new ArrayList<>();
        for (int f = 0; f < 8; f++) {
            String file = String.valueOf((char) ('a' + f));
            list.add(new Placement(t.of(back[f], "white"), file + "1"));
            list.add(new Placement(t.of("pawn", "white"), file + "2"));
            list.add(new Placement(t.of("pawn", "black"), file + "7"));
            list.add(new Placement(t.of(back[f], "black"), file + "8"));
        }
        return List.copyOf(list);
    }
}
final class PieceType {   // flyweight: intrinsic state only, immutable
    private final String kind, colour;
    private final byte[] sprite = new byte[4_096];   // never handed out
    PieceType(String kind, String colour) {
        this.kind = kind; this.colour = colour;
    }
    String draw(String square) { return colour + " " + kind + " at " + square; }
}
final class PieceTypes {   // factory: one instance per (kind, colour)
    private final Map<String, PieceType> cache = new ConcurrentHashMap<>();
    PieceType of(String kind, String colour) {
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(colour, "colour");
        return cache.computeIfAbsent(kind + "/" + colour,
            k -> new PieceType(kind, colour));
    }
    int size() { return cache.size(); }
}
record Placement(PieceType type, String square) {   // extrinsic state
    Placement {
        Objects.requireNonNull(type, "type");
        if (!square.matches("[a-h][1-8]"))
            throw new IllegalArgumentException("bad square " + square);
    }
    String draw() { return type.draw(square); }
}
