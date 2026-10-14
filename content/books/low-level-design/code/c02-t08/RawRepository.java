import java.util.LinkedHashMap;
import java.util.Map;

public class RawRepository {
    public static void main(String[] args) {
        var users = new ObjectStore();
        users.put("u1", new User("u1", "Asha"));
        users.put("u2", "Ravi"); // wrong type, still compiles
        User first = (User) users.get("u1");
        System.out.println("Loaded " + first.name());
        try {
            User second = (User) users.get("u2");
            System.out.println("Loaded " + second.name());
        } catch (ClassCastException e) {
            System.out.println("Crash at runtime: ClassCastException");
        }
    }
}

record User(String id, String name) {}

// Stores Object, so every caller must cast and hope.
class ObjectStore {
    private final Map<String, Object> rows = new LinkedHashMap<>();

    void put(String id, Object value) {
        rows.put(id, value);
    }

    Object get(String id) {
        return rows.get(id);
    }
}
