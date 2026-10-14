import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

public class ClinicDemo {
    public static void main(String[] args) {
        var desk = new FrontDesk(List.of(
                new ShiftClinician("Dr Ada", 11, 17),
                new SessionClinician("Dr Lee", Set.of(9, 14, 16))));
        for (int from : new int[] {8, 12, 17}) {
            Optional<Appointment> a = desk.earliest(new Request("Sam", from));
            System.out.println("from " + from + " -> "
                    + a.map(Appointment::toString).orElse("no slot"));
        }
        try {
            new ShiftClinician("Dr Ray", 11, 8);
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}

// Value objects: validated once, immutable after.
record Request(String patient, int fromHour) {
    Request {
        Objects.requireNonNull(patient, "patient");
        if (fromHour < 0 || fromHour > 23)
            throw new IllegalArgumentException("fromHour out of range");
    }
}
record Appointment(String clinician, String patient, int hour) {
    public String toString() { return clinician + " at " + hour; }
}

// The role that varies: each clinician keeps hours in its own way.
interface Availability {
    String name();
    Optional<Integer> firstFree(int fromHour);
}
record ShiftClinician(String name, int start, int end)
        implements Availability {
    ShiftClinician {
        Objects.requireNonNull(name, "name");
        if (start < 0 || end > 24 || start >= end)
            throw new IllegalArgumentException("bad shift hours");
    }
    public Optional<Integer> firstFree(int from) {
        int hour = Math.max(from, start);
        return hour < end ? Optional.of(hour) : Optional.empty();
    }
}
record SessionClinician(String name, Set<Integer> hours)
        implements Availability {
    SessionClinician {
        Objects.requireNonNull(name, "name");
        hours = Set.copyOf(hours);
    }
    public Optional<Integer> firstFree(int from) {
        return hours.stream().filter(h -> h >= from).min(Integer::compare);
    }
}

// Knows only the role; a new kind of clinician never edits this class.
final class FrontDesk {
    private final List<Availability> staff;
    FrontDesk(List<Availability> staff) {
        this.staff = List.copyOf(staff);
        if (this.staff.isEmpty())
            throw new IllegalArgumentException("no staff");
    }
    Optional<Appointment> earliest(Request r) {
        return staff.stream()
                .flatMap(c -> c.firstFree(r.fromHour()).stream()
                        .map(h -> new Appointment(c.name(), r.patient(), h)))
                .min(Comparator.comparingInt(Appointment::hour));
    }
}
