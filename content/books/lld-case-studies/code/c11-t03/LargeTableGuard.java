import java.util.*;

public class LargeTableGuard {
  public static void main(String[] args) {
    TableAllocationStrategy plain = new BestFitAllocation();
    TableAllocationStrategy guarded = new GuardLargeTables(plain, 6, 4);
    List<Table> lateEvening = List.of(new Table("T4", 6));
    List<Table> earlier = List.of(new Table("T3", 4), new Table("T4", 6));
    for (int party : new int[] {2, 5}) {
      System.out.println("party " + party
          + " | earlier: " + guarded.choose(earlier, party)
          + " | late best fit: " + plain.choose(lateEvening, party)
          + " | late guarded: " + guarded.choose(lateEvening, party));
    }
  }
}

record Table(String id, int capacity) {
  public String toString() { return id; }
}

interface TableAllocationStrategy {
  Optional<Table> choose(List<Table> free, int partySize);
}

class BestFitAllocation implements TableAllocationStrategy {
  public Optional<Table> choose(List<Table> free, int partySize) {
    return free.stream().filter(t -> t.capacity() >= partySize)
        .min(Comparator.comparingInt(Table::capacity)
            .thenComparing(Table::id));
  }
}

// New rule, new class: ReservationService and BestFitAllocation untouched.
// Tables of `large` seats or more go only to parties of `minParty` or more.
class GuardLargeTables implements TableAllocationStrategy {
  private final TableAllocationStrategy inner;
  private final int large, minParty;
  GuardLargeTables(TableAllocationStrategy inner, int large, int minParty) {
    this.inner = inner; this.large = large; this.minParty = minParty;
  }
  public Optional<Table> choose(List<Table> free, int partySize) {
    if (partySize >= minParty) return inner.choose(free, partySize);
    List<Table> allowed = new ArrayList<>();
    for (Table t : free) if (t.capacity() < large) allowed.add(t);
    return inner.choose(allowed, partySize);
  }
}
