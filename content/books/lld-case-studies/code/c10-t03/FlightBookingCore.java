import java.time.*;
import java.util.*;

public class FlightBookingCore {
  public static void main(String[] args) {
    Clock clock = Clock.fixed(Instant.parse("2026-02-10T09:00:00Z"),
        ZoneOffset.UTC);
    Flight f = new Flight("AI-101",
        List.of(new FareClass("Y-SAVER", 450000)));
    FareInventory inv = new InMemoryFareInventory();
    inv.load("AI-101", "Y-SAVER", 3);
    FlightBookingService svc = new FlightBookingService(inv,
        new FixedFarePricing(), (pnr, amount) -> true, clock);
    Booking a = svc.hold(f, "Y-SAVER", List.of("Asha", "Ravi"));
    System.out.println(a.pnr() + " " + a.status() + " " + a.amountMinor()
        + " until " + a.holdUntil());
    System.out.println("seats left: " + inv.seatsLeft("AI-101", "Y-SAVER"));
    try { svc.hold(f, "Y-SAVER", List.of("Meera", "Kiran")); }
    catch (IllegalStateException e) {
      System.out.println("refused: " + e.getMessage());
    }
    Booking paid = svc.pay(a.pnr());
    System.out.println(paid.pnr() + " " + paid.status());
    paid.tickets().forEach(System.out::println);
  }
}

enum Status { HELD, TICKETED }
record FareClass(String code, long priceMinor) {}
record Flight(String number, List<FareClass> fares) {
  FareClass fare(String code) {
    return fares.stream().filter(x -> x.code().equals(code)).findFirst()
        .orElseThrow(() -> new IllegalArgumentException("no fare " + code));
  }
}
record Ticket(String ticketNo, String pnr, String passenger) {}
record Booking(String pnr, String flightNo, String fareCode,
    List<String> passengers, long amountMinor, Instant holdUntil,
    Status status, List<Ticket> tickets) {
  Booking ticketed(List<Ticket> t) {
    return new Booking(pnr, flightNo, fareCode, passengers, amountMinor,
        holdUntil, Status.TICKETED, List.copyOf(t));
  }
}

interface FareInventory {
  void load(String flightNo, String fareCode, int seats);
  int seatsLeft(String flightNo, String fareCode);
  boolean reserve(String flightNo, String fareCode, int n);
}
interface PricingStrategy { long perPassenger(FareClass fare, int left); }
interface PaymentGateway { boolean charge(String pnr, long amountMinor); }

class InMemoryFareInventory implements FareInventory {
  private final Map<String, Integer> left = new HashMap<>();
  public void load(String f, String c, int n) { left.put(f + "/" + c, n); }
  public int seatsLeft(String f, String c) {
    return left.getOrDefault(f + "/" + c, 0);
  }
  public boolean reserve(String f, String c, int n) {
    int now = seatsLeft(f, c);
    if (now < n) return false;
    left.put(f + "/" + c, now - n);
    return true;
  }
}

class FixedFarePricing implements PricingStrategy {
  public long perPassenger(FareClass fare, int left) {
    return fare.priceMinor();
  }
}

class FlightBookingService {
  static final Duration HOLD = Duration.ofMinutes(15);
  private final FareInventory inventory;
  private final PricingStrategy pricing;
  private final PaymentGateway payments;
  private final Clock clock;
  private final Map<String, Booking> bookings = new LinkedHashMap<>();
  private int nextPnr = 1, nextTicket = 1;

  FlightBookingService(FareInventory inv, PricingStrategy pricing,
      PaymentGateway payments, Clock clock) {
    this.inventory = inv; this.pricing = pricing;
    this.payments = payments; this.clock = clock;
  }

  Booking hold(Flight f, String fareCode, List<String> pax) {
    FareClass fare = f.fare(fareCode);
    int left = inventory.seatsLeft(f.number(), fareCode);
    if (!inventory.reserve(f.number(), fareCode, pax.size()))
      throw new IllegalStateException(left + " left in " + fareCode);
    long total = pricing.perPassenger(fare, left) * pax.size();
    Booking b = new Booking("PNR-" + nextPnr++, f.number(), fareCode,
        List.copyOf(pax), total, clock.instant().plus(HOLD), Status.HELD,
        List.of());
    bookings.put(b.pnr(), b);
    return b;
  }

  Booking pay(String pnr) {
    Booking b = bookings.get(pnr);
    if (b == null || b.status() != Status.HELD)
      throw new IllegalStateException("no live hold " + pnr);
    if (!clock.instant().isBefore(b.holdUntil()))
      throw new IllegalStateException("hold expired " + pnr);
    if (!payments.charge(pnr, b.amountMinor()))
      throw new IllegalStateException("payment declined " + pnr);
    List<Ticket> tickets = new ArrayList<>();
    for (String p : b.passengers())
      tickets.add(new Ticket("TK-" + nextTicket++, pnr, p));
    Booking done = b.ticketed(tickets);
    bookings.put(pnr, done);
    return done;
  }
}
