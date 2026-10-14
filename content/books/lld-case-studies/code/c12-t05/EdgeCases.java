import java.util.ArrayList;
import java.util.List;

public class EdgeCases {
  public static void main(String[] args) {
    Room r = new Room();
    System.out.println("10:00-11:00 " + r.book("BK-1", 600, 660));
    System.out.println("11:00-12:00 " + r.book("BK-2", 660, 720));
    // No-show: a sweeper runs with the time passed in, not read.
    System.out.println("sweep 10:05 released " + r.sweep(605));
    System.out.println("sweep 10:12 released " + r.sweep(612));
    System.out.println("walk-in 10:15-11:00 " + r.book("BK-3", 615, 660));
    // v2 preview: daily series at 11:30 for 3 days, all or none.
    int day = 24 * 60;
    int[][] daily = {{690, 750}, {day + 690, day + 750},
        {2 * day + 690, 2 * day + 750}};
    System.out.println("series " + r.bookSeries("S-1", daily));
    System.out.println("bookings now " + r.active());
  }
}

class Room {
  record Slot(String id, int start, int end, boolean checkedIn) {}
  private final List<Slot> slots = new ArrayList<>();
  private static final int GRACE = 10;   // minutes to check in

  synchronized String book(String id, int s, int e) {
    for (Slot x : slots)
      if (s < x.end() && x.start() < e) return "CONFLICT with " + x.id();
    slots.add(new Slot(id, s, e, false));
    return "OK " + id;
  }
  synchronized List<String> sweep(int now) {
    List<String> gone = new ArrayList<>();
    slots.removeIf(x -> {
      boolean noShow = !x.checkedIn() && now >= x.start() + GRACE;
      if (noShow) gone.add(x.id());
      return noShow;
    });
    return gone;
  }
  synchronized String bookSeries(String id, int[][] occ) {
    for (int i = 0; i < occ.length; i++)
      for (Slot x : slots)
        if (occ[i][0] < x.end() && x.start() < occ[i][1])
          return "REFUSED: occurrence " + (i + 1) + " clashes " + x.id();
    for (int i = 0; i < occ.length; i++)
      slots.add(new Slot(id + "-" + (i + 1), occ[i][0], occ[i][1], false));
    return "OK " + occ.length + " occurrences";
  }
  synchronized List<String> active() {
    return slots.stream().map(Slot::id).sorted().toList();
  }
}
