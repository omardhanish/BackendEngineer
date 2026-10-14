import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

public class MutableIdentity {
    public static void main(String[] args) {
        Money price = new Money(500);
        Money fee = price;              // looks like a copy, is an alias
        fee.add(100);
        System.out.println("price: " + price.cents);
        System.out.println("500 equals 500? "
                + new Money(500).equals(new Money(500)));

        Customer ada = new Customer(7, "ada@old.io");
        Set<Customer> vip = new HashSet<>();
        vip.add(ada);
        ada.email = "ada@new.io";       // same person, new email
        System.out.println("ada still VIP? " + vip.contains(ada));
    }
}

// Value with no value semantics: mutable, and equals() is identity.
class Money {
    long cents;
    Money(long cents) { this.cents = cents; }
    void add(long more) { cents += more; }
}

// Entity whose equality uses a field that changes over its life.
class Customer {
    final long id;
    String email;
    Customer(long id, String email) { this.id = id; this.email = email; }
    @Override public boolean equals(Object o) {
        return o instanceof Customer c
                && c.id == id && c.email.equals(email);
    }
    @Override public int hashCode() { return Objects.hash(id, email); }
}
