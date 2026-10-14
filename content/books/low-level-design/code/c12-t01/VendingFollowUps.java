import java.util.Objects;

public class VendingFollowUps {
    public static void main(String[] args) {
        var cola = new Product("Cola", 150);
        // Follow-up 1: "Add a happy-hour discount." New class, no edits.
        var normal = new VendingMachine(new ListPrice());
        var happyHour = new VendingMachine(new PercentOff(20));
        System.out.println("Normal: " + normal.priceOf(cola));
        System.out.println("Happy hour: " + happyHour.priceOf(cola));
        // Follow-up 2: "What if someone inserts a bad coin?"
        for (int coin : new int[] {50, 0, -20}) {
            try {
                normal.insert(coin);
                System.out.println("Accepted " + coin);
            } catch (IllegalArgumentException e) {
                System.out.println("Rejected: " + e.getMessage());
            }
        }
        System.out.println("Credit: " + normal.credit());
    }
}

record Product(String name, int priceCents) {}

// The extension point you drew at minute 15.
interface PricingRule {
    int priceFor(Product product);
}

class ListPrice implements PricingRule {
    public int priceFor(Product product) { return product.priceCents(); }
}

class PercentOff implements PricingRule {
    private final int percent;

    PercentOff(int percent) {
        if (percent < 0 || percent > 100) {
            throw new IllegalArgumentException("percent must be 0-100");
        }
        this.percent = percent;
    }

    public int priceFor(Product product) {
        return product.priceCents() * (100 - percent) / 100;
    }
}

class VendingMachine {
    private final PricingRule pricing;
    private int creditCents;

    VendingMachine(PricingRule pricing) {
        this.pricing = Objects.requireNonNull(pricing, "pricing");
    }

    int priceOf(Product product) { return pricing.priceFor(product); }

    void insert(int cents) {
        if (cents <= 0) {
            throw new IllegalArgumentException("coin must be > 0: " + cents);
        }
        creditCents += cents;
    }

    int credit() { return creditCents; }
}
