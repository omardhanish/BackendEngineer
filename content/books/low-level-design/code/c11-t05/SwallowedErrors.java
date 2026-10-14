import java.util.ArrayList;
import java.util.List;

public class SwallowedErrors {
    public static void main(String[] args) {
        Endpoint api = new Endpoint(new BookingService());
        System.out.println("-> " + api.book("e1", "R1", 9.0, 10.0));
        System.out.println("-> " + api.book("e2", "R1", 9.5, 10.5));
        System.out.println("-> " + api.book(null, "R1", 13.0, 14.0));
    }
}

class BookingService {
    private final List<double[]> taken = new ArrayList<>();

    boolean book(String employeeId, String roomId, double start, double end) {
        try {
            if (employeeId.isBlank()) {          // NullPointerException if null
                return false;
            }
            for (double[] t : taken) {
                if (start < t[1] && t[0] < end) {
                    throw new IllegalStateException("taken");
                }
            }
            taken.add(new double[] {start, end});
            return true;
        } catch (Exception e) {                  // a clash and a bug look alike
            System.out.println("ERROR service: booking failed");
            return false;
        }
    }
}

class Endpoint {
    private final BookingService service;

    Endpoint(BookingService service) {
        this.service = service;
    }

    String book(String employeeId, String roomId, double start, double end) {
        if (!service.book(employeeId, roomId, start, end)) {
            System.out.println("ERROR endpoint: booking failed in " + roomId);
            return "500 something went wrong";
        }
        return "201 booked";
    }
}
