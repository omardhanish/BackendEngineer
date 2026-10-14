import java.util.HashSet;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

public class EntityValueDemo {
    public static void main(String[] args) {
        Money price = new Money(500, "EUR");
        Money total = price.plus(new Money(100, "EUR"));
        System.out.println("price: " + price + ", total: " + total);
        System.out.println("500 equals 500? "
                + new Money(500, "EUR").equals(new Money(500, "EUR")));
        var ada = new Customer(new CustomerId(7), new Email("Ada@Old.io"));
        Set<Customer> vip = new HashSet<>(Set.of(ada));
        ada.changeEmail(new Email("ada@new.io"));
        System.out.println("ada still VIP? " + vip.contains(ada));
        try {
            price.plus(new Money(100, "USD"));
        } catch (IllegalArgumentException e) {
            System.out.println("Rejected: " + e.getMessage());
        }
    }
}

// Value objects: immutable, validated once, equal by their values.
record Money(long cents, String currency) {
    Money {
        if (cents < 0) throw new IllegalArgumentException("cents < 0");
        Objects.requireNonNull(currency, "currency");
    }
    Money plus(Money other) {
        if (!currency.equals(other.currency()))
            throw new IllegalArgumentException("currency mismatch");
        return new Money(cents + other.cents(), currency);
    }
}

record Email(String value) {
    Email {
        if (value == null || !value.contains("@"))
            throw new IllegalArgumentException("bad email");
        value = value.toLowerCase(Locale.ROOT);
    }
}

record CustomerId(long value) {}

// Entity: identity is the id; everything else may change.
final class Customer {
    private final CustomerId id;
    private Email email;
    Customer(CustomerId id, Email email) {
        this.id = Objects.requireNonNull(id, "id");
        this.email = Objects.requireNonNull(email, "email");
    }
    void changeEmail(Email next) { email = Objects.requireNonNull(next); }
    @Override public boolean equals(Object o) {
        return o instanceof Customer c && c.id.equals(id);
    }
    @Override public int hashCode() { return id.hashCode(); }
}
