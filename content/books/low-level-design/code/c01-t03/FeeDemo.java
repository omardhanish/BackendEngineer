import java.util.List;

public class FeeDemo {
    public static void main(String[] args) {
        List<Fee> fees = List.of(
                new FlatFee(50), new PercentFee(2), new CappedFee(2, 30));
        for (Fee fee : fees) {
            System.out.println(fee.name() + " on 2000 = " + fee.on(2000));
        }
    }
}

interface Fee {                         // abstraction: what, not how
    long on(long amount);

    default String name() {
        return getClass().getSimpleName();
    }
}

record FlatFee(long value) implements Fee {
    @Override public long on(long amount) { return value; }
}

class PercentFee implements Fee {
    private final long percent;

    PercentFee(long percent) { this.percent = percent; }

    @Override public long on(long amount) { return amount * percent / 100; }
}

class CappedFee extends PercentFee {    // inheritance: a CappedFee is-a
    private final long cap;             // PercentFee with a ceiling

    CappedFee(long percent, long cap) {
        super(percent);
        this.cap = cap;
    }

    @Override
    public long on(long amount) {       // polymorphism: overrides on()
        return Math.min(super.on(amount), cap);
    }
}
