import java.time.Instant;
import java.util.*;

public class FlightModel {
  public static void main(String[] args) {
    Aircraft a320 = new Aircraft("A320", List.of(
        new Seat("1A", Cabin.BUSINESS), new Seat("1C", Cabin.BUSINESS),
        new Seat("12A", Cabin.ECONOMY), new Seat("12B", Cabin.ECONOMY)));
    FareClass saver = new FareClass("Y-SAVER", Cabin.ECONOMY, 450000, false);
    FareClass flex = new FareClass("J-FLEX", Cabin.BUSINESS, 1800000, true);
    Instant dep = Instant.parse("2026-03-01T06:00:00Z");
    Flight f = new Flight("AI-101", "BLR", "DEL", dep, a320,
        List.of(saver, flex));
    System.out.println(f.number() + " " + f.origin() + "->" + f.destination()
        + " economy seats: " + a320.seatsIn(Cabin.ECONOMY));
    Passenger asha = new Passenger("Asha Rao", "P1234567");
    Passenger ravi = new Passenger("Ravi Rao", "P7654321");
    Booking b = new Booking("PNR-1", f, saver, List.of(asha, ravi));
    System.out.println(b.pnr() + " " + b.fare().code() + " x"
        + b.passengers().size() + " = " + b.amountMinor() + " " + b.status());
    Ticket t = b.issueTicket("TK-1", asha, "12A");
    System.out.println(t.ticketNo() + " " + t.passenger().name()
        + " seat " + t.seatNo());
    tryIt(() -> b.issueTicket("TK-2", ravi, "1A"));
    tryIt(() -> new Flight("AI-102", "DEL", "DEL", dep, a320,
        List.of(saver)));
    tryIt(() -> new Booking("PNR-2", f, saver, List.of()));
  }

  static void tryIt(Runnable r) {
    try { r.run(); }
    catch (IllegalArgumentException e) {
      System.out.println("rejected: " + e.getMessage());
    }
  }
}

enum Cabin { ECONOMY, BUSINESS }

enum BookingStatus { HELD, CONFIRMED, TICKETED, CANCELLED, EXPIRED }

record Seat(String seatNo, Cabin cabin) {}

record Aircraft(String model, List<Seat> seats) {
  Aircraft { seats = List.copyOf(seats); }
  long seatsIn(Cabin c) {
    return seats.stream().filter(s -> s.cabin() == c).count();
  }
  Optional<Seat> seat(String no) {
    return seats.stream().filter(s -> s.seatNo().equals(no)).findFirst();
  }
}

record FareClass(String code, Cabin cabin, long priceMinor,
    boolean refundable) {}

record Flight(String number, String origin, String destination,
    Instant departsAt, Aircraft aircraft, List<FareClass> fares) {
  Flight {
    if (origin.equals(destination))
      throw new IllegalArgumentException("origin equals destination");
    fares = List.copyOf(fares);
  }
}

record Passenger(String name, String documentNo) {}

record Ticket(String ticketNo, String pnr, Passenger passenger,
    String seatNo) {}

class Booking {
  private final String pnr;
  private final Flight flight;
  private final FareClass fare;
  private final List<Passenger> passengers;
  private final List<Ticket> tickets = new ArrayList<>();
  private BookingStatus status = BookingStatus.HELD;

  Booking(String pnr, Flight flight, FareClass fare, List<Passenger> pax) {
    if (pax.isEmpty() || pax.size() > 9)
      throw new IllegalArgumentException("a booking needs 1 to 9 passengers");
    this.pnr = pnr; this.flight = flight; this.fare = fare;
    this.passengers = List.copyOf(pax);
  }
  String pnr() { return pnr; }
  FareClass fare() { return fare; }
  List<Passenger> passengers() { return passengers; }
  BookingStatus status() { return status; }
  long amountMinor() { return fare.priceMinor() * passengers.size(); }

  Ticket issueTicket(String ticketNo, Passenger p, String seatNo) {
    if (!passengers.contains(p))
      throw new IllegalArgumentException(p.name() + " is not on " + pnr);
    Seat seat = flight.aircraft().seat(seatNo).orElseThrow(
        () -> new IllegalArgumentException("no seat " + seatNo));
    if (seat.cabin() != fare.cabin())
      throw new IllegalArgumentException(seatNo + " is not in "
          + fare.cabin());
    Ticket t = new Ticket(ticketNo, pnr, p, seatNo);
    tickets.add(t);
    return t;
  }
}
