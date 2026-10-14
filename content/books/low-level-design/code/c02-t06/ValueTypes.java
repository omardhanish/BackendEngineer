import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class ValueTypes {
    public static void main(String[] args) {
        Money base = new Money(500, "GBP");
        Item tea = new Item("Tea", base, List.of("hot"));
        Item dearTea = tea.withPrice(base.plus(new Money(150, "GBP")));
        System.out.println(tea);
        System.out.println(dearTea);

        List<String> tags = new ArrayList<>(List.of("hot"));
        Item soup = new Item("Soup", new Money(400, "GBP"), tags);
        tags.add("vegan?");
        System.out.println("Soup tags " + soup.tags());

        Status next = Status.NEW.next();
        System.out.println(next + " -> " + next.next());
        try {
            new Money(-1, "GBP");
        } catch (IllegalArgumentException e) {
            System.out.println("Rejected: " + e.getMessage());
        }
    }
}

record Money(long cents, String currency) {
    Money { // compact constructor: runs before the fields are set
        Objects.requireNonNull(currency, "currency");
        if (cents < 0) throw new IllegalArgumentException("cents < 0");
    }
    Money plus(Money other) {
        if (!currency.equals(other.currency))
            throw new IllegalArgumentException("currency mismatch");
        return new Money(cents + other.cents, currency);
    }
}

enum Status {
    NEW, PAID, SHIPPED;
    Status next() {
        return switch (this) {
            case NEW -> PAID;
            case PAID, SHIPPED -> SHIPPED;
        };
    }
}

record Item(String name, Money price, List<String> tags) {
    Item {
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(price, "price");
        tags = List.copyOf(tags); // defensive and unmodifiable copy
    }
    Item withPrice(Money newPrice) {
        return new Item(name, newPrice, tags);
    }
}
