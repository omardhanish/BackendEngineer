import java.util.HashMap;
import java.util.Map;

public class RushedBikeShare {
    // Straight to code: two maps instead of a model.
    private final Map<String, String> bikeStatus = new HashMap<>();
    private final Map<String, Integer> rideCount = new HashMap<>();

    void unlock(String rider, String bike) {
        if ("OUT".equals(bikeStatus.get(bike)))
            throw new IllegalStateException(bike + " is out");
        bikeStatus.put(bike, "OUT");
        rideCount.merge(rider, 1, Integer::sum);
    }

    // Nothing records WHO is riding a bike, so anyone can dock it.
    void dock(String rider, String bike) {
        bikeStatus.put(bike, "DOCKED");
        rideCount.merge(rider, -1, Integer::sum);
    }

    public static void main(String[] args) {
        var share = new RushedBikeShare();
        share.unlock("alice", "B1");
        share.dock("bob", "B1");
        share.dock("bob", "B9");
        System.out.println("alice rides: " + share.rideCount.get("alice"));
        System.out.println("bob rides: " + share.rideCount.get("bob"));
        System.out.println("B1: " + share.bikeStatus.get("B1"));
        System.out.println("B9: " + share.bikeStatus.get("B9"));
    }
}
