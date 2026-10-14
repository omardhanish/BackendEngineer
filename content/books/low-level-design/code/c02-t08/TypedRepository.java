import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public class TypedRepository {
    public static void main(String[] args) {
        var users = new InMemoryRepository<String, User>();
        users.saveAll(List.of(new User("u1", "Asha"), new User("u2", "Ravi")));
        // users.save("Ravi"); // would not compile: String is not a User
        System.out.println(users.findById("u2").map(User::name).orElse("-"));
        System.out.println("u9 present: " + users.findById("u9").isPresent());

        List<Entity<String>> sink = new ArrayList<>();
        users.copyTo(sink);
        System.out.println("copied " + sink.size() + " entities");

        var orders = new InMemoryRepository<Integer, Order>();
        orders.save(new Order(101, 2500));
        System.out.println(orders.findById(101).orElseThrow());
    }
}

interface Entity<ID> {
    ID id();
}

record User(String id, String name) implements Entity<String> {}
record Order(Integer id, long totalCents) implements Entity<Integer> {}

interface Repository<ID, T extends Entity<ID>> {
    void save(T item);
    Optional<T> findById(ID id);
}

// One implementation for any entity type; the compiler checks each call.
final class InMemoryRepository<ID, T extends Entity<ID>>
        implements Repository<ID, T> {
    private final Map<ID, T> rows = new LinkedHashMap<>();

    public void save(T item) {
        Objects.requireNonNull(item, "item");
        rows.put(item.id(), item);
    }
    public Optional<T> findById(ID id) {
        return Optional.ofNullable(rows.get(id));
    }
    // Producer: reads T from a collection of T or of any subtype.
    void saveAll(Collection<? extends T> items) {
        items.forEach(this::save);
    }
    // Consumer: writes T into a collection of T or of any supertype.
    void copyTo(Collection<? super T> target) {
        target.addAll(rows.values());
    }
}
