import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Optional;

public class ObjectPoolDemo {
    public static void main(String[] args) {
        ConnectionPool pool = new ConnectionPool(2);
        Connection a = pool.acquire().orElseThrow();
        Connection b = pool.acquire().orElseThrow();
        System.out.println(a.query("rooms") + " | " + b.query("users"));
        System.out.println("third acquire: " + pool.acquire().isPresent());

        pool.release(a);
        Connection c = pool.acquire().orElseThrow();
        System.out.println("reused a: " + (c == a)
            + ", created: " + pool.created());
    }
}

class Connection {
    private final int id;
    Connection(int id) { this.id = id; }
    String query(String table) { return "conn-" + id + " reads " + table; }
}

class ConnectionPool {
    private final Deque<Connection> idle = new ArrayDeque<>();
    private final int max;
    private int created;

    ConnectionPool(int max) { this.max = max; }

    Optional<Connection> acquire() {
        if (!idle.isEmpty()) return Optional.of(idle.pop());
        if (created < max) return Optional.of(new Connection(++created));
        return Optional.empty();
    }

    void release(Connection c) { idle.push(c); }

    int created() { return created; }
}
