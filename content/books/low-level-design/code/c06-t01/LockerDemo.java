import java.util.*;
public class LockerDemo {
    public static void main(String[] args) {
        LockerService service = new LockerService(
            List.of(new Locker("L1", Size.SMALL),
                    new Locker("L2", Size.LARGE),
                    new Locker("L3", Size.MEDIUM)),
            new SmallestFit());
        var asks = List.of(Size.SMALL, Size.SMALL, Size.LARGE, Size.MEDIUM);
        for (int i = 0; i < asks.size(); i++)
            System.out.println(service.deposit("p" + (i + 1), asks.get(i)));
    }
}

enum Size { SMALL, MEDIUM, LARGE }
record Locker(String id, Size size) {}

interface AssignPolicy {
    Optional<Locker> pick(Size need, List<Locker> free);
}

class SmallestFit implements AssignPolicy {
    public Optional<Locker> pick(Size need, List<Locker> free) {
        return free.stream()
            .filter(l -> l.size().compareTo(need) >= 0)
            .min(Comparator.comparing(Locker::size));
    }
}

class LockerService {
    private final List<Locker> lockers;
    private final AssignPolicy policy;
    private final Map<Locker, String> parcels = new HashMap<>();
    LockerService(List<Locker> lockers, AssignPolicy policy) {
        this.lockers = lockers;
        this.policy = policy;
    }
    String deposit(String parcel, Size size) {
        List<Locker> free = lockers.stream()
            .filter(l -> !parcels.containsKey(l)).toList();
        Optional<Locker> slot = policy.pick(size, free);
        slot.ifPresent(l -> parcels.put(l, parcel));
        return parcel + " -> " + slot.map(Locker::id).orElse("no locker");
    }
}
