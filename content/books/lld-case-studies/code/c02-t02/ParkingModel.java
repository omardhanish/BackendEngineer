import java.time.Instant;
import java.util.List;
import java.util.Objects;

public class ParkingModel {
  public static void main(String[] args) {
    Floor f1 = new Floor(1, List.of(
        new ParkingSpot("F1-M1", SpotType.MOTORBIKE),
        new ParkingSpot("F1-C1", SpotType.COMPACT),
        new ParkingSpot("F1-L1", SpotType.LARGE)));
    ParkingLot lot = new ParkingLot("PL-1", List.of(f1),
        List.of(new EntryGate("IN-1")), List.of(new ExitGate("OUT-1")));
    Instant nine = Instant.parse("2026-01-15T09:00:00Z");
    Vehicle car = new Vehicle(" ka01ab1234 ", VehicleType.CAR);
    Ticket t = new Ticket("T-1", car, lot.spot("F1-C1"), nine);
    System.out.println(t.id + " " + car.plate() + " at " + t.spotId
        + " " + t.status);
    System.out.println("lot " + lot.id() + " has " + lot.spotCount()
        + " spots, " + lot.entries().size() + " entry gate");
    Vehicle truck = new Vehicle("TN09TR0001", VehicleType.TRUCK);
    try {
      new Ticket("T-2", truck, lot.spot("F1-C1"), nine);
    } catch (IllegalArgumentException e) {
      System.out.println("rejected: " + e.getMessage());
    }
    try {
      new Payment("P-1", "T-1", -500);
    } catch (IllegalArgumentException e) {
      System.out.println("rejected: " + e.getMessage());
    }
  }
}

enum SpotType { MOTORBIKE, COMPACT, LARGE }

enum VehicleType {
  MOTORBIKE(SpotType.MOTORBIKE, SpotType.COMPACT, SpotType.LARGE),
  CAR(SpotType.COMPACT, SpotType.LARGE),
  TRUCK(SpotType.LARGE);

  final List<SpotType> fits;
  VehicleType(SpotType... fits) { this.fits = List.of(fits); }
}

enum TicketStatus { ACTIVE, LOST, PAID, EXITED }

record Vehicle(String plate, VehicleType type) {
  Vehicle {
    Objects.requireNonNull(type);
    plate = plate.strip().toUpperCase();
    if (plate.isEmpty()) throw new IllegalArgumentException("empty plate");
  }
}

class ParkingSpot {
  final String id;
  final SpotType type;
  ParkingSpot(String id, SpotType type) { this.id = id; this.type = type; }
  boolean fits(VehicleType v) { return v.fits.contains(type); }
}

record Floor(int number, List<ParkingSpot> spots) {
  Floor { spots = List.copyOf(spots); }
}

record EntryGate(String id) {}

record ExitGate(String id) {}

record ParkingLot(String id, List<Floor> floors, List<EntryGate> entries,
    List<ExitGate> exits) {
  int spotCount() {
    return floors.stream().mapToInt(f -> f.spots().size()).sum();
  }
  ParkingSpot spot(String spotId) {
    return floors.stream().flatMap(f -> f.spots().stream())
        .filter(s -> s.id.equals(spotId)).findFirst()
        .orElseThrow(() -> new IllegalArgumentException("no " + spotId));
  }
}

class Ticket {
  final String id, spotId;
  final Vehicle vehicle;
  final Instant entryAt;
  TicketStatus status = TicketStatus.ACTIVE;   // only field that changes
  Ticket(String id, Vehicle vehicle, ParkingSpot spot, Instant entryAt) {
    if (!spot.fits(vehicle.type()))
      throw new IllegalArgumentException(vehicle.type() + " does not fit "
          + spot.id + " (" + spot.type + ")");
    this.id = id; this.vehicle = vehicle;
    this.spotId = spot.id; this.entryAt = entryAt;
  }
}

record Payment(String id, String ticketId, long amountMinor) {
  Payment {
    if (amountMinor < 0)
      throw new IllegalArgumentException("negative amount " + amountMinor);
  }
}

interface FeeStrategy {
  long feeMinor(VehicleType type, java.time.Duration stay);
}
