import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class CopiedFieldsBug {
    public static void main(String[] args) {
        Directory directory = new Directory();
        directory.put("e7", "asha@old.example");

        List<BookingRow> rows = new ArrayList<>();
        rows.add(BookingRow.of("B1", "R1", "e7", directory, 9.0, 10.0));
        rows.add(BookingRow.of("B2", "R2", "e7", directory, 14.0, 15.0));

        directory.put("e7", "asha@new.example"); // HR fixes the address

        for (BookingRow row : rows) {
            System.out.println("reminder " + row.id() + " -> "
                + row.ownerEmail());
        }
        System.out.println("directory e7 -> " + directory.email("e7"));
    }
}

// Modelled from the booking screen: one flat row, fields copied in.
record BookingRow(String id, String roomId, String ownerEmail,
                  double start, double end) {
    static BookingRow of(String id, String roomId, String employeeId,
                         Directory directory, double start, double end) {
        // The employee id is dropped; only a snapshot of the email stays.
        return new BookingRow(id, roomId, directory.email(employeeId),
            start, end);
    }
}

class Directory {
    private final Map<String, String> emails = new TreeMap<>();

    void put(String employeeId, String email) {
        emails.put(employeeId, email);
    }

    String email(String employeeId) {
        return emails.get(employeeId);
    }
}
