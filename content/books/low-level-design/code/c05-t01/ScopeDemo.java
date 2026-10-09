import java.util.List;

public class ScopeDemo {
    public static void main(String[] args) {
        List<Requirement> reqs = List.of(
            new Requirement("R1", "search free rooms", Priority.MUST,
                "BookingService"),
            new Requirement("R2", "book a room", Priority.MUST,
                "BookingService"),
            new Requirement("R3", "cancel own booking", Priority.MUST,
                "BookingService"),
            new Requirement("R4", "no double booking", Priority.MUST,
                "ConflictPolicy"),
            new Requirement("R5", "notify attendees", Priority.MUST,
                "NotificationService"),
            new Requirement("R6", "recurring bookings", Priority.STRETCH,
                "later"));
        for (Priority p : Priority.values()) {
            System.out.println(p + ":");
            reqs.stream()
                .filter(r -> r.priority() == p)
                .forEach(r -> System.out.println("  " + r));
        }
    }
}

enum Priority { MUST, STRETCH }

record Requirement(String id, String text, Priority priority,
                   String owner) {
    @Override
    public String toString() {
        return id + " " + text + " -> " + owner;
    }
}
