public class EntityDemo {
    public static void main(String[] args) {
        Building hq = new Building("B1", "Head office");
        Room orion = new Room("R-101", hq.id(), 6);
        Employee ada = new Employee("E7", "Ada");
        Booking ok = new Booking("BK1", orion.id(), ada.id(), 10, 11.5);
        System.out.println(ok);
        try {
            new Booking("BK2", orion.id(), ada.id(), 14, 13);
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
        try {
            new Room("R-102", hq.id(), 0);
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}

record Building(String id, String name) {}

record Employee(String id, String name) {}

record Room(String id, String buildingId, int capacity) {
    Room {
        if (capacity < 1) {
            throw new IllegalArgumentException("capacity must be >= 1");
        }
    }
}

record Booking(String id, String roomId, String employeeId,
               double start, double end) {
    Booking {
        if (start < 0 || end > 24 || end <= start) {
            throw new IllegalArgumentException(
                "slot " + start + "-" + end + " is not valid");
        }
    }
}
