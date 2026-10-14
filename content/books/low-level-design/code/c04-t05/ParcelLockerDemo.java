import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public class ParcelLockerDemo {
    public static void main(String[] args) {
        var gateway = new RecordingGateway();
        var lockers = new LockerService(2, gateway);
        String a = lockers.dropOff("Ada", "books");
        String b = lockers.dropOff("Lin", "shoes");
        System.out.println("Codes issued: " + a + ", " + b);
        try {
            lockers.dropOff("Sam", "lamp");
        } catch (IllegalStateException e) {
            System.out.println("Third drop-off: " + e.getMessage());
        }
        System.out.println("Bad code: "
                + lockers.collect("Eve", "9999", 1).orElse("denied"));
        System.out.println("Day 1: "
                + lockers.collect("Bo", a, 1).orElse("denied"));
        System.out.println("Day 5: "
                + lockers.collect("Kim", b, 5).orElse("denied"));
        System.out.println("Charges: " + gateway.charges());
    }
}

// Secondary actor: an outside system becomes an interface at the boundary.
interface PaymentGateway {
    boolean charge(String payer, int cents);
}

final class RecordingGateway implements PaymentGateway {
    private final List<String> charges = new ArrayList<>();
    public boolean charge(String payer, int cents) {
        charges.add(payer + " " + cents);
        return true;
    }
    List<String> charges() { return List.copyOf(charges); }
}

// One method per use case; included steps are helpers or guard checks.
final class LockerService {
    private static final int POSTAGE = 300, LATE_FEE = 150, FREE_DAYS = 3;
    private final Map<String, String> parcels = new LinkedHashMap<>();
    private final PaymentGateway gateway;
    private final int capacity;
    private int nextCode = 4100;

    LockerService(int capacity, PaymentGateway gateway) {
        if (capacity < 1) throw new IllegalArgumentException("capacity < 1");
        this.capacity = capacity;
        this.gateway = Objects.requireNonNull(gateway, "gateway");
    }
    // "Drop off parcel" always includes "Pay postage".
    String dropOff(String sender, String item) {
        Objects.requireNonNull(item, "item");
        if (parcels.size() == capacity)
            throw new IllegalStateException("all lockers full");
        pay(sender, POSTAGE);
        String code = String.valueOf(nextCode++);
        parcels.put(code, item);
        return code;
    }
    // "Collect parcel" includes the code check; a late fee extends it.
    Optional<String> collect(String recipient, String code, int daysWaited) {
        if (!parcels.containsKey(code)) return Optional.empty();
        if (daysWaited > FREE_DAYS) pay(recipient, LATE_FEE);
        return Optional.of(parcels.remove(code));
    }
    private void pay(String payer, int cents) {
        if (!gateway.charge(payer, cents))
            throw new IllegalStateException("payment declined");
    }
}
