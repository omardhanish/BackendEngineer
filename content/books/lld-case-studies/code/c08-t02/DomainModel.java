import java.time.Instant;
import java.util.*;

public class DomainModel {
  public static void main(String[] args) {
    Movie movie = new Movie("MV-1", "Night Train", 128);
    Screen screen = new Screen("SC-1", "Audi 1", List.of(
        new Seat("A1", SeatType.REGULAR), new Seat("A2", SeatType.REGULAR),
        new Seat("P1", SeatType.PREMIUM)));
    Theatre theatre = new Theatre("TH-1", "City Plaza", List.of(screen));
    Show show = new Show("SH-1", movie, screen,
        Instant.parse("2026-01-15T18:30:00Z"),
        Map.of(SeatType.REGULAR, 25000L, SeatType.PREMIUM, 40000L));
    System.out.println(theatre.name() + " > " + screen.name()
        + " > " + show.movie().title());

    SeatHold hold = new SeatHold("H-1", show.id(), "U-7",
        List.of("A1", "P1"), Instant.parse("2026-01-15T18:10:00Z"));
    Instant now = Instant.parse("2026-01-15T18:05:00Z");
    System.out.println("hold expired? " + hold.isExpiredAt(now));
    Booking booking = Booking.fromHold("BK-1", hold, show);
    System.out.println(booking);

    try {
      show.priceOf("Z9");
    } catch (IllegalArgumentException e) {
      System.out.println("rejected: " + e.getMessage());
    }
    try {
      new SeatHold("H-2", show.id(), "U-7", List.of(), now);
    } catch (IllegalArgumentException e) {
      System.out.println("rejected: " + e.getMessage());
    }
  }
}

enum SeatType { REGULAR, PREMIUM }

enum BookingStatus { PENDING, CONFIRMED, EXPIRED, CANCELLED }

record Movie(String id, String title, int durationMin) {}

record Seat(String id, SeatType type) {}

record Screen(String id, String name, List<Seat> seats) {
  Seat seat(String seatId) {
    return seats.stream().filter(s -> s.id().equals(seatId)).findFirst()
        .orElseThrow(() -> new IllegalArgumentException(
            "no seat " + seatId + " in " + name));
  }
}

record Theatre(String id, String name, List<Screen> screens) {}

record Show(String id, Movie movie, Screen screen, Instant startsAt,
    Map<SeatType, Long> priceMinor) {
  long priceOf(String seatId) {
    return priceMinor.get(screen.seat(seatId).type());
  }
}

record SeatHold(String id, String showId, String userId,
    List<String> seatIds, Instant expiresAt) {
  SeatHold {
    if (seatIds.isEmpty()) throw new IllegalArgumentException(
        "a hold needs at least one seat");
    seatIds = List.copyOf(seatIds);
  }
  boolean isExpiredAt(Instant now) { return !now.isBefore(expiresAt); }
}

final class Booking {
  final String id, showId, userId;
  final List<String> seatIds;
  final long amountMinor;
  BookingStatus status = BookingStatus.PENDING;

  private Booking(String id, SeatHold h, long amountMinor) {
    this.id = id; this.showId = h.showId(); this.userId = h.userId();
    this.seatIds = h.seatIds(); this.amountMinor = amountMinor;
  }
  static Booking fromHold(String id, SeatHold hold, Show show) {
    long total = 0;
    for (String s : hold.seatIds()) total += show.priceOf(s);
    return new Booking(id, hold, total);
  }
  public String toString() {
    return id + " " + seatIds + " " + amountMinor + " " + status;
  }
}
