import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.TreeMap;

public class HappyPathDemo {
    public static void main(String[] args) {
        var board = new Leaderboard();
        board.record("ana", 90);
        board.record("ben", 75);
        board.record("cy", 60);
        System.out.println("Top 2: " + board.top(2));
        // Interviewer: "What happens when two players tie?"
        board.record("dee", 90);
        System.out.println("Top 2: " + board.top(2));
        System.out.println("Players: " + board.size());
    }
}

class Leaderboard {
    // Score -> player, highest first. Sorted for free, or so it seems.
    private final TreeMap<Integer, String> byScore =
            new TreeMap<>(Collections.reverseOrder());

    void record(String player, int score) {
        byScore.put(score, Objects.requireNonNull(player, "player"));
    }

    List<String> top(int k) {
        List<String> out = new ArrayList<>();
        for (String player : byScore.values()) {
            if (out.size() == k) {
                break;
            }
            out.add(player);
        }
        return out;
    }

    int size() { return byScore.size(); }
}
