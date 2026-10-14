import java.time.*;
import java.util.*;

public class SportsModel {
  public static void main(String[] args) {
    Court c1 = new Court("C-1", "Turf 1", Sport.FOOTBALL, true);
    Court c2 = new Court("C-2", "Hall A", Sport.BADMINTON, false);
    Ground g = new Ground("G-1", "Riverside Arena", List.of(c1, c2));
    LocalDate fri = LocalDate.of(2026, 3, 6);
    TimeSlot evening = TimeSlot.of(fri, 18, 2);   // 18:00-20:00
    TimeSlot late = TimeSlot.of(fri, 19, 1);      // 19:00-20:00
    TimeSlot after = TimeSlot.of(fri, 20, 1);     // 20:00-21:00
    System.out.println(evening + " overlaps " + late + "? "
        + evening.overlaps(late));
    System.out.println(evening + " overlaps " + after + "? "
        + evening.overlaps(after));
    PricingStrategy flat = (court, slot) -> 60000L * slot.hours();
    Booking b = new Booking("BK-1", g.court("C-1"), "P-7", evening,
        flat.priceOf(c1, evening));
    System.out.println(b);
    for (Runnable bad : List.<Runnable>of(
        () -> g.court("C-9"),
        () -> new TimeSlot(fri.atTime(18, 30), fri.atTime(19, 30)),
        () -> TimeSlot.of(fri, 20, 0))) {
      try { bad.run(); }
      catch (IllegalArgumentException e) {
        System.out.println("rejected: " + e.getMessage());
      }
    }
  }
}

enum Sport { FOOTBALL, BADMINTON, TENNIS, CRICKET }

enum BookingStatus { PENDING, CONFIRMED, CANCELLED, EXPIRED, COMPLETED }

record Court(String id, String name, Sport sport, boolean outdoor) {}

record Ground(String id, String name, List<Court> courts) {
  Ground { courts = List.copyOf(courts); }
  Court court(String courtId) {
    return courts.stream().filter(c -> c.id().equals(courtId))
        .findFirst().orElseThrow(() -> new IllegalArgumentException(
            "no court " + courtId + " at " + name));
  }
}

// Half-open interval [start, end) of whole hours.
record TimeSlot(LocalDateTime start, LocalDateTime end) {
  TimeSlot {
    if (start.getMinute() != 0 || end.getMinute() != 0)
      throw new IllegalArgumentException("slots start on the hour");
    if (!end.isAfter(start))
      throw new IllegalArgumentException("end must be after start");
  }
  static TimeSlot of(LocalDate day, int hour, int hours) {
    LocalDateTime s = day.atTime(hour, 0);
    return new TimeSlot(s, s.plusHours(hours));
  }
  int hours() { return (int) Duration.between(start, end).toHours(); }
  boolean overlaps(TimeSlot o) {
    return start.isBefore(o.end) && o.start.isBefore(end);
  }
  public String toString() {
    return start.toLocalTime() + "-" + end.toLocalTime();
  }
}

interface PricingStrategy { long priceOf(Court court, TimeSlot slot); }

class Booking {
  final String id, playerId;
  final Court court;
  final TimeSlot slot;
  final long amountMinor;
  BookingStatus status = BookingStatus.PENDING;
  Booking(String id, Court court, String playerId, TimeSlot slot,
      long amountMinor) {
    if (amountMinor < 0) throw new IllegalArgumentException("negative");
    this.id = id; this.court = court; this.playerId = playerId;
    this.slot = slot; this.amountMinor = amountMinor;
  }
  public String toString() {
    return id + " " + court.id() + " " + slot + " " + playerId + " "
        + amountMinor + " " + status;
  }
}
