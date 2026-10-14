import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class AcceptanceChecks {
    private static int passed = 0;
    private static int failed = 0;
    private static int pending = 0;

    public static void main(String[] args) {
        SlotBook rooms = new SlotBook();
        check("books a free room", rooms.tryBook("R1", 9.0, 10.0));
        check("rejects an overlapping slot", !rooms.tryBook("R1", 9.5, 10.5));
        check("allows back-to-back slots", rooms.tryBook("R1", 10.0, 11.0));
        check("same hours, other room is fine", rooms.tryBook("R2", 9.0, 10.0));
        check("rejects end before start", !rooms.tryBook("R3", 11.0, 10.0));
        todo("search free rooms by capacity");
        todo("only the owner may cancel");
        todo("notify and audit every change");
        System.out.println(passed + " passed, " + failed + " failed, "
            + pending + " pending");
    }

    static void check(String name, boolean ok) {
        if (ok) {
            passed++;
        } else {
            failed++;
        }
        System.out.println((ok ? "PASS " : "FAIL ") + name);
    }

    static void todo(String name) {
        pending++;
        System.out.println("TODO " + name);
    }
}

// The thinnest model that can answer the first five checks.
class SlotBook {
    private final Map<String, List<double[]>> taken = new TreeMap<>();

    boolean tryBook(String roomId, double start, double end) {
        if (start >= end) {
            return false;
        }
        List<double[]> slots =
            taken.computeIfAbsent(roomId, id -> new ArrayList<>());
        for (double[] s : slots) {
            if (start < s[1] && s[0] < end) {
                return false;
            }
        }
        slots.add(new double[] {start, end});
        return true;
    }
}
