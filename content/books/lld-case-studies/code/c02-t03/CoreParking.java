import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class CoreParking {
  public static void main(String[] args) {
    ParkingLot lot = new ParkingLot(List.of(
        new Floor(1, List.of(new ParkingSpot("F1-C1", SpotType.COMPACT),
            new ParkingSpot("F1-L1", SpotType.LARGE))),
        new Floor(2, List.of(new ParkingSpot("F2-C1", SpotType.COMPACT)))),
        new NearestFirst(), new HourlyFee());
    EntryGate in = new EntryGate("IN-1", lot);
    ExitGate out = new ExitGate("OUT-1", lot);
    Instant nine = Instant.parse("2026-01-15T09:00:00Z");
    in.admit(new Vehicle("KA01AB1234", VehicleType.CAR), nine);
    in.admit(new Vehicle("KA05CD5678", VehicleType.CAR), nine);
    in.admit(new Vehicle("TN09TR0001", VehicleType.TRUCK), nine);
    in.admit(new Vehicle("KA03EF9012", VehicleType.CAR), nine);
    out.release("T-1", nine.plus(Duration.ofMinutes(150)));
    in.admit(new Vehicle("KA03EF9012", VehicleType.CAR),
        nine.plus(Duration.ofMinutes(151)));
  }
}

enum SpotType { MOTORBIKE, COMPACT, LARGE }          // smallest first

enum VehicleType {
  MOTORBIKE(SpotType.MOTORBIKE, SpotType.COMPACT, SpotType.LARGE),
  CAR(SpotType.COMPACT, SpotType.LARGE),
  TRUCK(SpotType.LARGE);
  final List<SpotType> fits;
  VehicleType(SpotType... fits) { this.fits = List.of(fits); }
}

record Vehicle(String plate, VehicleType type) {}
record Floor(int number, List<ParkingSpot> spots) {}
record Ticket(String id, Vehicle vehicle, String spotId, Instant entryAt) {}
record Payment(String ticketId, long amountMinor) {}

class ParkingSpot {
  final String id; final SpotType type; String ticketId;  // null = free
  ParkingSpot(String id, SpotType type) { this.id = id; this.type = type; }
}

interface SpotAllocationStrategy {
  Optional<ParkingSpot> pick(List<Floor> floors, VehicleType type);
}

interface FeeStrategy { long feeMinor(VehicleType type, Duration stay); }

class NearestFirst implements SpotAllocationStrategy {
  public Optional<ParkingSpot> pick(List<Floor> floors, VehicleType t) {
    for (SpotType wanted : t.fits)           // smallest fitting type first
      for (Floor f : floors)                 // then the lowest floor
        for (ParkingSpot s : f.spots())
          if (s.type == wanted && s.ticketId == null) return Optional.of(s);
    return Optional.empty();
  }
}

class HourlyFee implements FeeStrategy {
  public long feeMinor(VehicleType type, Duration stay) {
    long rate = switch (type) {              // paise per started hour
      case MOTORBIKE -> 2000; case CAR -> 5000; case TRUCK -> 10000; };
    long hours = Math.max(1, (stay.toMinutes() + 59) / 60);
    return rate * hours;
  }
}

class ParkingLot {                           // facade the gates talk to
  private final List<Floor> floors;
  private final SpotAllocationStrategy allocator;
  private final FeeStrategy fees;
  private final Map<String, Ticket> open = new LinkedHashMap<>();
  private int nextId = 1;

  ParkingLot(List<Floor> floors, SpotAllocationStrategy a, FeeStrategy f) {
    this.floors = floors; this.allocator = a; this.fees = f;
  }
  Optional<Ticket> park(Vehicle v, Instant at) {
    Optional<ParkingSpot> spot = allocator.pick(floors, v.type());
    if (spot.isEmpty()) return Optional.empty();
    Ticket t = new Ticket("T-" + nextId++, v, spot.get().id, at);
    spot.get().ticketId = t.id();
    open.put(t.id(), t);
    return Optional.of(t);
  }
  Payment checkout(String ticketId, Instant at) {
    Ticket t = open.remove(ticketId);
    if (t == null) throw new IllegalArgumentException("unknown " + ticketId);
    Duration stay = Duration.between(t.entryAt(), at);
    for (Floor f : floors)
      for (ParkingSpot s : f.spots())
        if (s.id.equals(t.spotId())) s.ticketId = null;
    return new Payment(t.id(), fees.feeMinor(t.vehicle().type(), stay));
  }
}

record EntryGate(String id, ParkingLot lot) {
  void admit(Vehicle v, Instant at) {
    String result = lot.park(v, at).map(t -> t.id() + " at " + t.spotId())
        .orElse("LOT_FULL, barrier stays down");
    System.out.println(id + " " + v.plate() + ": " + result);
  }
}

record ExitGate(String id, ParkingLot lot) {
  void release(String ticketId, Instant at) {
    Payment p = lot.checkout(ticketId, at);
    System.out.println(id + " " + ticketId + ": paid " + p.amountMinor());
  }
}
