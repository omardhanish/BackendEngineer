import java.time.*;
import java.util.*;
import java.util.function.Supplier;

public class CoreReservation {
  public static void main(String[] args) {
    Clock clock = Clock.fixed(Instant.parse("2026-03-06T12:00:00Z"),
        ZoneOffset.UTC);
    List<Table> tables = List.of(new Table("T1", 2), new Table("T2", 4),
        new Table("T3", 4), new Table("T4", 6));
    int[] n = {0};
    ReservationService svc = new ReservationService(tables, 90,
        new BestFitAllocation(), new InMemoryReservations(),
        () -> "RV-" + (++n[0]), clock);
    Instant seven = Instant.parse("2026-03-06T19:00:00Z");
    int[][] asks = {{2, 0}, {3, 0}, {4, 0}, {4, 0}, {3, 0}, {2, 90}};
    for (int[] a : asks) {
      Instant at = seven.plus(Duration.ofMinutes(a[1]));
      try {
        System.out.println(svc.book("C-" + a[0], a[0], at));
      } catch (IllegalStateException e) {
        System.out.println("party of " + a[0] + " refused: "
            + e.getMessage());
      }
    }
    try {
      svc.book("C-9", 2, Instant.parse("2026-03-06T11:00:00Z"));
    } catch (IllegalStateException e) {
      System.out.println("refused: " + e.getMessage());
    }
  }
}

record Table(String id, int capacity) {}

record TimeSlot(Instant start, Instant end) {
  boolean overlaps(TimeSlot o) {
    return start.isBefore(o.end) && o.start.isBefore(end);
  }
}

record Reservation(String id, String customerId, String tableId,
    int partySize, TimeSlot slot) {
  public String toString() {
    return id + " " + tableId + " x" + partySize + " at "
        + slot.start().toString().substring(11, 16);
  }
}

interface TableAllocationStrategy {           // strategy: which table?
  Optional<Table> choose(List<Table> free, int partySize);
}

class BestFitAllocation implements TableAllocationStrategy {
  public Optional<Table> choose(List<Table> free, int partySize) {
    return free.stream().filter(t -> t.capacity() >= partySize)
        .min(Comparator.comparingInt(Table::capacity)
            .thenComparing(Table::id));
  }
}

interface ReservationRepository {             // memory now, SQL later
  List<Reservation> forTable(String tableId);
  void save(Reservation r);
}

class InMemoryReservations implements ReservationRepository {
  private final Map<String, List<Reservation>> byTable =
      new LinkedHashMap<>();
  public List<Reservation> forTable(String tableId) {
    return byTable.getOrDefault(tableId, List.of());
  }
  public void save(Reservation r) {
    byTable.computeIfAbsent(r.tableId(), k -> new ArrayList<>()).add(r);
  }
}

class ReservationService {                    // facade for callers
  private final List<Table> tables;
  private final Duration seating;
  private final TableAllocationStrategy allocation;
  private final ReservationRepository repo;
  private final Supplier<String> ids;
  private final Clock clock;

  ReservationService(List<Table> tables, int diningMinutes,
      TableAllocationStrategy allocation, ReservationRepository repo,
      Supplier<String> ids, Clock clock) {
    this.tables = List.copyOf(tables);
    this.seating = Duration.ofMinutes(diningMinutes);
    this.allocation = allocation; this.repo = repo;
    this.ids = ids; this.clock = clock;
  }

  Reservation book(String customerId, int partySize, Instant start) {
    if (start.isBefore(clock.instant()))
      throw new IllegalStateException("start is in the past");
    TimeSlot slot = new TimeSlot(start, start.plus(seating));
    List<Table> free = new ArrayList<>();
    for (Table t : tables) {
      boolean busy = repo.forTable(t.id()).stream()
          .anyMatch(r -> r.slot().overlaps(slot));
      if (!busy) free.add(t);
    }
    Table table = allocation.choose(free, partySize)
        .orElseThrow(() -> new IllegalStateException("NO_TABLE"));
    Reservation r = new Reservation(ids.get(), customerId, table.id(),
        partySize, slot);
    repo.save(r);
    return r;
  }
}
