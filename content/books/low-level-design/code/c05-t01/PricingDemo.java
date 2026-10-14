import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

public class PricingDemo {
    public static void main(String[] args) {
        var feed = new LivePriceFeed(Map.of("tea", 250, "cake", 400));
        var checkout = new Checkout(feed);
        System.out.println(checkout.describe("tea"));
        feed.setOnline(false);                     // the feed goes down
        System.out.println(checkout.describe("tea"));
        System.out.println(checkout.describe("cake"));
        try {
            checkout.describe(null);
        } catch (NullPointerException e) {
            // Stands in for a request handler's last-resort catch.
            System.out.println("bug surfaced: " + e.getMessage());
        }
    }
}

// Checked: an outage is temporary, and the caller can recover from it.
class FeedDownException extends Exception {
    FeedDownException(String message) { super(message); }
}

class LivePriceFeed {
    private final Map<String, Integer> pricesInCents;
    private boolean online = true;

    LivePriceFeed(Map<String, Integer> pricesInCents) {
        this.pricesInCents = Map.copyOf(pricesInCents);
    }
    void setOnline(boolean online) { this.online = online; }

    int price(String sku) throws FeedDownException {
        // Unchecked: a null sku is a caller bug, so fail fast.
        Objects.requireNonNull(sku, "sku must not be null");
        if (!online) throw new FeedDownException("price feed offline");
        Integer cents = pricesInCents.get(sku);
        if (cents == null)                     // a caller bug, not an outage
            throw new IllegalArgumentException("unlisted sku " + sku);
        return cents;
    }
}

class Checkout {
    private final LivePriceFeed feed;
    private final Map<String, Integer> lastKnown = new HashMap<>();

    Checkout(LivePriceFeed feed) {
        this.feed = Objects.requireNonNull(feed, "feed");
    }

    String describe(String sku) {
        try {
            int cents = feed.price(sku);
            lastKnown.put(sku, cents);
            return sku + " costs " + cents + " cents";
        } catch (FeedDownException e) {
            Integer cached = lastKnown.get(sku);   // recover: fall back
            if (cached != null) return sku + " costs " + cached + " (cached)";
            return sku + ": " + e.getMessage() + ", try again soon";
        }
    }
}
