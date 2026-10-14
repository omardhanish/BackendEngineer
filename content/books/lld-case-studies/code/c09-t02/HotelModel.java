import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

public class HotelModel {
  public static void main(String[] args) {
    RoomType deluxe = new RoomType("DLX", "Deluxe King", 2, 650000L);
    RoomType twin = new RoomType("TWN", "Standard Twin", 2, 420000L);
    Hotel hotel = new Hotel("HT-1", "Harbour View", List.of(
        new Room("101", twin), new Room("102", twin),
        new Room("201", deluxe)));
    System.out.println(hotel.name() + " DLX rooms: "
        + hotel.countOf(deluxe));

    Guest guest = new Guest("G-7", "Asha Rao", "asha@example.com");
    DateRange stay = new DateRange(LocalDate.of(2026, 3, 10),
        LocalDate.of(2026, 3, 13));
    Reservation r = new Reservation("RS-1", guest, hotel.id(), deluxe,
        stay, 2, new FreeUntilDaysBefore(2));
    System.out.println(r);
    System.out.println("refund if cancelled on 03-07: "
        + r.refundIfCancelledOn(LocalDate.of(2026, 3, 7)));
    System.out.println("refund if cancelled on 03-09: "
        + r.refundIfCancelledOn(LocalDate.of(2026, 3, 9)));

    try {
      new Reservation("RS-2", guest, hotel.id(), twin, stay, 3,
          new FreeUntilDaysBefore(2));
    } catch (IllegalArgumentException e) {
      System.out.println("rejected: " + e.getMessage());
    }
    try {
      new DateRange(LocalDate.of(2026, 3, 13), LocalDate.of(2026, 3, 13));
    } catch (IllegalArgumentException e) {
      System.out.println("rejected: " + e.getMessage());
    }
  }
}

enum ReservationStatus {
  HELD, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED, EXPIRED, NO_SHOW
}

record RoomType(String code, String name, int maxGuests,
    long nightlyRateMinor) {}

record Room(String number, RoomType type) {}

record Guest(String id, String name, String email) {}

record Hotel(String id, String name, List<Room> rooms) {
  long countOf(RoomType t) {
    return rooms.stream().filter(r -> r.type().equals(t)).count();
  }
}

record DateRange(LocalDate checkIn, LocalDate checkOut) {
  DateRange {
    if (!checkOut.isAfter(checkIn)) throw new IllegalArgumentException(
        "stay needs at least one night");
  }
  long nights() { return ChronoUnit.DAYS.between(checkIn, checkOut); }
}

interface CancellationPolicy {
  long refundMinor(long paidMinor, LocalDate checkIn, LocalDate cancelOn);
}

record FreeUntilDaysBefore(int days) implements CancellationPolicy {
  public long refundMinor(long paid, LocalDate checkIn, LocalDate on) {
    return ChronoUnit.DAYS.between(on, checkIn) >= days ? paid : 0;
  }
}

final class Reservation {
  final String id, hotelId;
  final Guest guest;
  final RoomType roomType;
  final DateRange stay;
  final long amountMinor;
  final CancellationPolicy policy;
  ReservationStatus status = ReservationStatus.HELD;
  Room assignedRoom;                       // set at check-in, not before

  Reservation(String id, Guest guest, String hotelId, RoomType type,
      DateRange stay, int guests, CancellationPolicy policy) {
    if (guests > type.maxGuests()) throw new IllegalArgumentException(
        guests + " guests do not fit " + type.code());
    this.id = id; this.guest = guest; this.hotelId = hotelId;
    this.roomType = type; this.stay = stay; this.policy = policy;
    this.amountMinor = type.nightlyRateMinor() * stay.nights();
  }
  long refundIfCancelledOn(LocalDate day) {
    return policy.refundMinor(amountMinor, stay.checkIn(), day);
  }
  public String toString() {
    return id + " " + roomType.code() + " " + stay.nights() + " nights "
        + amountMinor + " " + status;
  }
}
