import java.util.List;
import java.util.Set;

public class ExtensiblePricer {
    public static void main(String[] args) {
        Pricer pricer = new Pricer(List.of(
            new MemberDiscount(10),
            new CouponDiscount(1_500),
            new HolidaySurcharge(5)));
        Cart couponHolder = new Cart(10_000, Set.of(Tag.COUPON));
        System.out.println("coupon holder pays " + pricer.total(couponHolder));
    }
}

enum Tag { MEMBER, COUPON, HOLIDAY }

// Named tags replace a row of positional booleans.
record Cart(long cents, Set<Tag> tags) {
    Cart {
        if (cents < 0) {
            throw new IllegalArgumentException("cents must be >= 0");
        }
        tags = Set.copyOf(tags);
    }
}

// The extension point. A new rule is a new class, not a new branch.
interface PriceRule {
    long apply(Cart cart, long price);
}

record MemberDiscount(int percent) implements PriceRule {
    MemberDiscount {
        if (percent < 0 || percent > 100) {
            throw new IllegalArgumentException("percent must be 0..100");
        }
    }
    public long apply(Cart cart, long price) {
        boolean on = cart.tags().contains(Tag.MEMBER);
        return on ? price * (100 - percent) / 100 : price;
    }
}

record CouponDiscount(long cents) implements PriceRule {
    CouponDiscount {
        if (cents < 0) {
            throw new IllegalArgumentException("cents must be >= 0");
        }
    }
    public long apply(Cart cart, long price) {
        boolean on = cart.tags().contains(Tag.COUPON);
        return on ? price - cents : price;
    }
}

record HolidaySurcharge(int percent) implements PriceRule {
    HolidaySurcharge {
        if (percent < 0) {
            throw new IllegalArgumentException("percent must be >= 0");
        }
    }
    public long apply(Cart cart, long price) {
        boolean on = cart.tags().contains(Tag.HOLIDAY);
        return on ? price * (100 + percent) / 100 : price;
    }
}

// Closed for modification: it only runs the rules it was given.
final class Pricer {
    private final List<PriceRule> rules;

    Pricer(List<PriceRule> rules) {
        this.rules = List.copyOf(rules);
    }

    long total(Cart cart) {
        long price = cart.cents();
        for (PriceRule rule : rules) {
            long next = rule.apply(cart, price);
            System.out.println("  " + rule + ": " + price + " -> " + next);
            price = next;
        }
        return Math.max(0, price);
    }
}
