import java.util.List;

public class SubclassExplosion {
    public static void main(String[] args) {
        List<CardGateway> variants = List.of(
            new CardGateway(),
            new LoggingCardGateway(),
            new LimitedCardGateway(),
            new LoggingLimitedCardGateway());
        for (CardGateway g : variants) {
            String name = g.getClass().getSimpleName();
            System.out.println(name + " -> " + g.charge("A-1", 50_000));
        }
        int features = 3; // logging, limit check, retry
        int gateways = 2; // card, wallet
        int combos = (1 << features) - 1; // every non-empty mix
        System.out.println("subclasses needed: " + gateways * combos);
    }
}

class CardGateway {
    String charge(String orderId, long cents) {
        return "PAID " + orderId + " " + cents;
    }
}

class LoggingCardGateway extends CardGateway {
    @Override
    String charge(String orderId, long cents) {
        System.out.println("  log: charge " + orderId);
        return super.charge(orderId, cents);
    }
}

class LimitedCardGateway extends CardGateway {
    @Override
    String charge(String orderId, long cents) {
        if (cents > 10_000) return "DECLINED " + orderId;
        return super.charge(orderId, cents);
    }
}

// Both features: the logging code is copied, not reused.
class LoggingLimitedCardGateway extends LimitedCardGateway {
    @Override
    String charge(String orderId, long cents) {
        System.out.println("  log: charge " + orderId);
        return super.charge(orderId, cents);
    }
}
