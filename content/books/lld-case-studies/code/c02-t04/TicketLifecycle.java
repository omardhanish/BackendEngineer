import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public class TicketLifecycle {
  public static void main(String[] args) {
    Ticket t1 = new Ticket("T-1");
    step(t1, TicketStatus.PAID);
    step(t1, TicketStatus.EXITED);
    Ticket t2 = new Ticket("T-2");
    step(t2, TicketStatus.EXITED);            // tries to leave unpaid
    Ticket t3 = new Ticket("T-3");
    step(t3, TicketStatus.LOST);              // attendant marks it lost
    step(t3, TicketStatus.PAID);              // flat lost-ticket fee
    Ticket t4 = new Ticket("T-4");
    step(t4, TicketStatus.PAID);
    step(t4, TicketStatus.ACTIVE);            // grace window ran out
    step(t1, TicketStatus.PAID);              // EXITED is final
  }

  static void step(Ticket t, TicketStatus next) {
    TicketStatus from = t.status();
    try {
      t.moveTo(next);
      System.out.println(t.id + " " + from + " -> " + next);
    } catch (IllegalStateException e) {
      System.out.println(t.id + " refused: " + e.getMessage());
    }
  }
}

enum TicketStatus {
  ACTIVE, LOST, PAID, EXITED;

  private static final Map<TicketStatus, Set<TicketStatus>> NEXT =
      new EnumMap<>(TicketStatus.class);
  static {
    NEXT.put(ACTIVE, EnumSet.of(PAID, LOST));
    NEXT.put(LOST, EnumSet.of(PAID));
    NEXT.put(PAID, EnumSet.of(EXITED, ACTIVE));
    NEXT.put(EXITED, EnumSet.noneOf(TicketStatus.class));
  }

  boolean canMoveTo(TicketStatus next) {
    return NEXT.get(this).contains(next);
  }
}

class Ticket {
  final String id;
  private TicketStatus status = TicketStatus.ACTIVE;

  Ticket(String id) { this.id = id; }
  TicketStatus status() { return status; }

  void moveTo(TicketStatus next) {             // the only way to change it
    if (!status.canMoveTo(next))
      throw new IllegalStateException(status + " -> " + next);
    status = next;
  }
}
