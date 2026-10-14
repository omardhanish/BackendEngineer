import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public class LeaderboardChecks {
    private static int failures = 0;
    public static void main(String[] args) {
        var board = new Leaderboard();
        board.record("ana", 90);
        board.record("ben", 75);
        board.record("dee", 90);
        check("ties keep both", board.size() == 3);
        check("ties break by name", board.top(2).equals(List.of("ana", "dee")));
        check("k above size returns all", board.top(10).size() == 3);
        board.record("ben", 95);
        check("new score replaces old", board.top(1).equals(List.of("ben")));
        check("k of zero rejected", rejects(() -> board.top(0)));
        check("negative score rejected", rejects(() -> board.record("x", -1)));
        System.out.println(failures + " failure(s)");
    }

    static void check(String name, boolean ok) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    static boolean rejects(Runnable action) {
        try {
            action.run();
            return false;
        } catch (IllegalArgumentException expected) {
            return true;
        }
    }
}

class Leaderboard {
    // Player -> score: one entry per player, so ties cannot collide.
    private final Map<String, Integer> scores = new HashMap<>();

    void record(String player, int score) {
        Objects.requireNonNull(player, "player");
        if (score < 0) throw new IllegalArgumentException("score < 0");
        scores.put(player, score);
    }

    List<String> top(int k) {
        if (k <= 0) throw new IllegalArgumentException("k must be > 0");
        return scores.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue()
                        .reversed()
                        .thenComparing(Map.Entry.comparingByKey()))
                .limit(k)
                .map(Map.Entry::getKey)
                .toList();
    }

    int size() { return scores.size(); }
}
