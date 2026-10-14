import java.util.Comparator;
import java.util.List;
import java.util.Optional;

public class NearestFloor {
  public static void main(String[] args) {
    List<Room> free = List.of(new Room("R-1", "Orion", 3, 4),
        new Room("R-2", "Vega", 3, 10), new Room("R-3", "Lyra", 5, 6));
    List<RoomSelectionStrategy> policies = List.of(
        new SmallestFitStrategy(), new NearestFloorStrategy(5));
    for (RoomSelectionStrategy p : policies) {
      String pick = p.pick(free, 4).map(Room::name).orElse("none");
      System.out.println(p.getClass().getSimpleName() + " -> " + pick);
    }
  }
}

record Room(String id, String name, int floor, int capacity) {}

interface RoomSelectionStrategy {
  Optional<Room> pick(List<Room> freeRooms, int attendees);
}

class SmallestFitStrategy implements RoomSelectionStrategy {
  public Optional<Room> pick(List<Room> free, int attendees) {
    return free.stream().filter(r -> r.capacity() >= attendees)
        .min(Comparator.comparingInt(Room::capacity)
            .thenComparing(Room::id));
  }
}

// New policy: added as a new class. BookingService is not edited.
class NearestFloorStrategy implements RoomSelectionStrategy {
  private final int organizerFloor;
  NearestFloorStrategy(int floor) { this.organizerFloor = floor; }
  public Optional<Room> pick(List<Room> free, int attendees) {
    return free.stream().filter(r -> r.capacity() >= attendees)
        .min(Comparator.comparingInt(
                (Room r) -> Math.abs(r.floor() - organizerFloor))
            .thenComparingInt(Room::capacity));
  }
}
