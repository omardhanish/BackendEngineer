import java.util.Objects;

public class GatewayDecoratorDemo {
    public static void main(String[] args) {
        PaymentGateway gateway = new Logging(
            new LimitCheck(new Retrying(new CardGateway(), 3), 10_000));
        System.out.println("-> " + gateway.charge("A-1", 2_500));
        System.out.println("-> " + gateway.charge("A-2", 50_000));
    }
}
interface PaymentGateway { String charge(String orderId, long cents); }
final class CardGateway implements PaymentGateway {
    private int calls; // the first call times out, to show retry
    @Override public String charge(String orderId, long cents) {
        if (++calls == 1) throw new IllegalStateException("timeout");
        return "PAID " + orderId + " " + cents;
    }
}

abstract class GatewayDecorator implements PaymentGateway {
    protected final PaymentGateway inner;
    GatewayDecorator(PaymentGateway inner) {
        this.inner = Objects.requireNonNull(inner, "inner");
    }
}
final class Logging extends GatewayDecorator {
    Logging(PaymentGateway inner) { super(inner); }
    @Override public String charge(String orderId, long cents) {
        System.out.println("log: charge " + orderId);
        String result = inner.charge(orderId, cents);
        System.out.println("log: " + result);
        return result;
    }
}
final class LimitCheck extends GatewayDecorator {
    private final long maxCents;
    LimitCheck(PaymentGateway inner, long maxCents) {
        super(inner);
        if (maxCents <= 0) throw new IllegalArgumentException("maxCents");
        this.maxCents = maxCents;
    }
    @Override public String charge(String orderId, long cents) {
        if (cents > maxCents) return "DECLINED " + orderId + " over limit";
        return inner.charge(orderId, cents);
    }
}
final class Retrying extends GatewayDecorator {
    private final int attempts;
    Retrying(PaymentGateway inner, int attempts) {
        super(inner);
        if (attempts < 1) throw new IllegalArgumentException("attempts");
        this.attempts = attempts;
    }
    @Override public String charge(String orderId, long cents) {
        for (int i = 1; ; i++) {
            try { return inner.charge(orderId, cents); }
            catch (IllegalStateException e) {
                System.out.println("retry " + i + ": " + e.getMessage());
                if (i == attempts) throw e;
            }
        }
    }
}
