import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.function.Supplier;

public class DomainModel {
    public static void main(String[] args) {
        Building hq = new Building("HQ", "Head office");
        Room focus = new Room("R1", hq.id(), 6);
        Map<String, Employee> staff = new TreeMap<>();
        staff.put("e7", new Employee("e7", "Asha", "asha@old.example"));
        Booking b1 = new Booking("B1", focus.id(), "e7", 9.0, 10.0);

        staff.put("e7", new Employee("e7", "Asha", "asha@new.example"));
        System.out.println("reminder B1 -> "
            + staff.get(b1.employeeId()).email());
        System.out.println("e7 owns B1: " + b1.isOwnedBy("e7"));
        System.out.println("e9 owns B1: " + b1.isOwnedBy("e9"));

        attempt(() -> new Room("R9", hq.id(), 0));
        attempt(() -> new Booking("B2", "R1", "e7", 11.0, 10.0));
        attempt(() -> new Booking("B3", "R1", "e7", 23.0, 25.0));
    }

    static void attempt(Supplier<Object> create) {
        try {
            System.out.println("created " + create.get());
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}

record Building(String id, String name) {
    Building {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(name, "name");
    }
}

record Room(String id, String buildingId, int capacity) {
    Room {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(buildingId, "buildingId");
        if (capacity < 1) {
            throw new IllegalArgumentException(
                "capacity must be at least 1, was " + capacity);
        }
    }
}

record Employee(String id, String name, String email) {
    Employee {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(email, "email");
    }
}

record Booking(String id, String roomId, String employeeId,
               double start, double end) {
    Booking {
        Objects.requireNonNull(roomId, "roomId");
        Objects.requireNonNull(employeeId, "employeeId");
        if (start < 0 || end > 24 || start >= end) {
            throw new IllegalArgumentException(
                "need 0 <= start < end <= 24, got " + start + "-" + end);
        }
    }

    boolean isOwnedBy(String candidateId) {
        return employeeId.equals(candidateId);
    }
}
