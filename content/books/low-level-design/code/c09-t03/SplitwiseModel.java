import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public class SplitwiseModel {
    public static void main(String[] args) {
        User asha = new User("u1", "Asha"), ben = new User("u2", "Ben");
        User chen = new User("u3", "Chen"), zed = new User("u9", "Zed");
        Group trip = new Group("Goa trip", List.of(asha, ben, chen));
        trip.add(new Expense("e1", "Dinner", asha, 10_000,
                List.of(new Share(asha, 3334), new Share(ben, 3333),
                        new Share(chen, 3333))));
        attempt(() -> new Expense("e2", "Taxi", ben, 10_000,
                List.of(new Share(ben, 3333), new Share(chen, 3333))));
        attempt(() -> trip.add(new Expense("e3", "Boat", asha, 600,
                List.of(new Share(asha, 300), new Share(zed, 300)))));
        for (Expense e : trip.expenses())
            System.out.println(trip.name() + ": " + e.description() + " "
                    + e.totalCents() + " cents, paid by " + e.paidBy().name());
    }
    static void attempt(Runnable r) {
        try { r.run(); }
        catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}

record User(String id, String name) {
    User { Objects.requireNonNull(id); Objects.requireNonNull(name); }
}
record Share(User user, long cents) {
    Share { if (cents < 0) throw new IllegalArgumentException("share < 0"); }
}
record Expense(String id, String description, User paidBy, long totalCents,
               List<Share> shares) {
    Expense {
        if (totalCents <= 0) throw new IllegalArgumentException("total <= 0");
        shares = List.copyOf(shares);              // frozen from here on
        long sum = shares.stream().mapToLong(Share::cents).sum();
        if (sum != totalCents) throw new IllegalArgumentException(
                "shares sum to " + sum + ", total is " + totalCents);
    }
}

final class Group {
    private final String name;
    private final Map<String, User> members = new LinkedHashMap<>();
    private final List<Expense> expenses = new ArrayList<>();

    Group(String name, List<User> users) {
        this.name = Objects.requireNonNull(name);
        users.forEach(u -> members.put(u.id(), u));
    }
    void add(Expense e) {
        if (!members.containsKey(e.paidBy().id())) throw new
                IllegalArgumentException("payer not in group");
        for (Share s : e.shares())
            if (!members.containsKey(s.user().id())) throw new
                    IllegalArgumentException(s.user().name() + " not in group");
        expenses.add(e);
    }
    String name() { return name; }
    List<Expense> expenses() { return List.copyOf(expenses); }
}
