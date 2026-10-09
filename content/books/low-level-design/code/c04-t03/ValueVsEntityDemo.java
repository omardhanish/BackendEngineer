import java.util.Objects;

public class ValueVsEntityDemo {
    public static void main(String[] args) {
        Money a = new Money(500, "EUR");
        Money b = new Money(500, "EUR");
        System.out.println("same money? " + a.equals(b));
        System.out.println("sum " + a.plus(b));

        Customer first = new Customer("C-7", "Ana");
        Customer later = new Customer("C-7", "Ana");
        later.rename("Ana Ruiz");
        System.out.println("same customer? " + first.equals(later));

        try {
            a.plus(new Money(100, "USD"));
        } catch (IllegalArgumentException e) {
            System.out.println("refused: " + e.getMessage());
        }
    }
}

record Money(long cents, String currency) {     // value object
    Money {
        Objects.requireNonNull(currency, "currency");
        if (cents < 0) throw new IllegalArgumentException("negative");
    }
    Money plus(Money other) {                   // returns a new value
        if (!currency.equals(other.currency)) {
            throw new IllegalArgumentException("currency mismatch");
        }
        return new Money(cents + other.cents, currency);
    }
}

class Customer {                                // entity: same id, same thing
    private final String id;
    private String name;
    Customer(String id, String name) { this.id = id; this.name = name; }
    void rename(String newName) { this.name = newName; }
    @Override public boolean equals(Object o) {
        return o instanceof Customer other && other.id.equals(id);
    }
    @Override public int hashCode() { return id.hashCode(); }
}
