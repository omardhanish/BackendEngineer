import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

public class SpreadLoad {
  public static void main(String[] args) {
    List<Floor> floors = List.of(floor(1, 4, 3), floor(2, 4, 1),
        floor(3, 4, 0));
    List<SpotAllocationStrategy> strategies =
        List.of(new NearestFirst(), new LeastBusyFloor());
    for (SpotAllocationStrategy s : strategies) {
      String pick = s.pick(floors, VehicleType.CAR).map(p -> p.id)
          .orElse("none");
      System.out.println(s.getClass().getSimpleName() + " -> " + pick);
    }
  }

  static Floor floor(int no, int spots, int taken) {
    List<ParkingSpot> list = new ArrayList<>();
    for (int i = 1; i <= spots; i++) {
      ParkingSpot s = new ParkingSpot("F" + no + "-C" + i, SpotType.COMPACT);
      if (i <= taken) s.ticketId = "T-" + no + i;
      list.add(s);
    }
    return new Floor(no, list);
  }
}

// The same shapes as CoreParking, repeated so this file runs on its own.
enum SpotType { MOTORBIKE, COMPACT, LARGE }          // smallest first

enum VehicleType {
  MOTORBIKE(SpotType.MOTORBIKE, SpotType.COMPACT, SpotType.LARGE),
  CAR(SpotType.COMPACT, SpotType.LARGE),
  TRUCK(SpotType.LARGE);
  final List<SpotType> fits;
  VehicleType(SpotType... fits) { this.fits = List.of(fits); }
}

record Floor(int number, List<ParkingSpot> spots) {}

class ParkingSpot {
  final String id; final SpotType type; String ticketId;  // null = free
  ParkingSpot(String id, SpotType type) { this.id = id; this.type = type; }
}

interface SpotAllocationStrategy {
  Optional<ParkingSpot> pick(List<Floor> floors, VehicleType type);
}

class NearestFirst implements SpotAllocationStrategy {       // unchanged
  public Optional<ParkingSpot> pick(List<Floor> floors, VehicleType t) {
    for (SpotType wanted : t.fits)           // smallest fitting type first
      for (Floor f : floors)                 // then the lowest floor
        for (ParkingSpot s : f.spots())
          if (s.type == wanted && s.ticketId == null) return Optional.of(s);
    return Optional.empty();
  }
}

class LeastBusyFloor implements SpotAllocationStrategy {     // new class
  public Optional<ParkingSpot> pick(List<Floor> floors, VehicleType t) {
    Comparator<Floor> byFree = Comparator.comparingLong(f -> free(f, t));
    return floors.stream().filter(f -> free(f, t) > 0)
        .max(byFree.thenComparing(Floor::number, Comparator.reverseOrder()))
        .flatMap(f -> new NearestFirst().pick(List.of(f), t));
  }
  static long free(Floor f, VehicleType t) {   // free spots this type fits
    return f.spots().stream()
        .filter(s -> s.ticketId == null && t.fits.contains(s.type)).count();
  }
}
