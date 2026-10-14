import java.util.Objects;

public class RenewalDemo {
    public static void main(String[] args) {
        var pricing = new RenewalPricing(new Money(4000));
        for (Member m : new Member[] {
                new Member("Ada", 22), new Member("Lin", 40)}) {
            Money due = pricing.priceFor(m, new Term(3));
            System.out.println(Receipt.line(m, due));
        }
        try {
            new Term(-3);
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}

// Primitive obsession fixed: a term is a value that checks itself.
record Term(int months) {
    Term {
        if (months < 1 || months > 24)
            throw new IllegalArgumentException("bad term: " + months);
    }
}

record Money(long cents) {
    Money {
        if (cents < 0) throw new IllegalArgumentException("negative money");
    }
    Money times(int n) { return new Money(cents * n); }
    Money percentOff(int p) { return new Money(cents - cents * p / 100); }
    @Override public String toString() {
        return String.format("%d.%02d", cents / 100, cents % 100);
    }
}

// The discount rule moved into the class that owns the age.
record Member(String name, int age) {
    static final int STUDENT_MAX_AGE = 25;
    static final int STUDENT_DISCOUNT_PERCENT = 20;
    Member {
        Objects.requireNonNull(name, "name");
        if (age < 0) throw new IllegalArgumentException("negative age");
    }
    int discountPercent() {
        return age <= STUDENT_MAX_AGE ? STUDENT_DISCOUNT_PERCENT : 0;
    }
}

// The long method's steps, each now a named call on its owner.
final class RenewalPricing {
    private final Money monthly;
    RenewalPricing(Money monthly) {
        this.monthly = Objects.requireNonNull(monthly, "monthly");
    }
    Money priceFor(Member member, Term term) {
        return monthly.times(term.months())
                .percentOff(member.discountPercent());
    }
}

// Receives the price; it no longer recomputes the discount.
final class Receipt {
    static String line(Member member, Money due) {
        return "receipt for " + member.name() + ": " + due;
    }
}
