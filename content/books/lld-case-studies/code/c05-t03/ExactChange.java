import java.util.*;

public class ExactChange {
  public static void main(String[] args) {
    NavigableMap<Long, Integer> stock =
        new TreeMap<>(Comparator.reverseOrder());
    stock.putAll(Map.of(50_000L, 1, 20_000L, 3));   // 500x1, 200x3
    for (DispensePlanner p : List.of(new GreedyPlanner(),
        new BacktrackingPlanner()))
      System.out.println(p.getClass().getSimpleName() + " 60000 -> "
          + p.plan(60_000, stock).map(Object::toString).orElse("refused"));
  }
}

interface DispensePlanner {
  Optional<Map<Long, Integer>> plan(long amount,
      NavigableMap<Long, Integer> stock);
}

class GreedyPlanner implements DispensePlanner {      // unchanged
  public Optional<Map<Long, Integer>> plan(long amount,
      NavigableMap<Long, Integer> stock) {
    Map<Long, Integer> out = new LinkedHashMap<>();
    for (var e : stock.entrySet()) {
      int n = (int) Math.min(e.getValue(), amount / e.getKey());
      if (n > 0) { out.put(e.getKey(), n); amount -= n * e.getKey(); }
    }
    return amount == 0 ? Optional.of(out) : Optional.empty();
  }
}

// New policy, new class. ATM and CashDispenser are not edited.
class BacktrackingPlanner implements DispensePlanner {
  public Optional<Map<Long, Integer>> plan(long amount,
      NavigableMap<Long, Integer> stock) {
    List<Long> notes = new ArrayList<>(stock.keySet());  // largest first
    Map<Long, Integer> out = new LinkedHashMap<>();
    return search(amount, 0, notes, stock, out)
        ? Optional.of(out) : Optional.empty();
  }
  private boolean search(long left, int i, List<Long> notes,
      Map<Long, Integer> stock, Map<Long, Integer> out) {
    if (left == 0) return true;
    if (i == notes.size()) return false;
    long note = notes.get(i);
    for (int n = (int) Math.min(stock.get(note), left / note); n >= 0; n--) {
      if (n > 0) out.put(note, n); else out.remove(note);
      if (search(left - n * note, i + 1, notes, stock, out)) return true;
    }
    return false;
  }
}
