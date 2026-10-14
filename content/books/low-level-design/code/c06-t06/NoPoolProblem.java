import java.util.ArrayList;
import java.util.List;

public class NoPoolProblem {
    public static void main(String[] args) {
        Database db = new Database(20);

        // Steady traffic: every request pays for a fresh connection.
        for (int i = 0; i < 1000; i++) {
            Connection c = db.open();
            c.close();
        }
        System.out.println("connections opened: " + db.opened());

        // A burst: 25 requests holding connections at once.
        List<Connection> held = new ArrayList<>();
        try {
            for (int i = 1; i <= 25; i++) held.add(db.open());
        } catch (IllegalStateException e) {
            System.out.println("request " + (held.size() + 1)
                    + " failed: " + e.getMessage());
        }
    }
}

class Database {
    private final int maxConnections;
    private int open;
    private int opened;

    Database(int maxConnections) { this.maxConnections = maxConnections; }

    Connection open() {
        if (open == maxConnections)
            throw new IllegalStateException("too many connections");
        open++;
        opened++; // imagine a network handshake here
        return new Connection(this);
    }

    void closed() { open--; }
    int opened() { return opened; }
}

class Connection {
    private final Database db;
    Connection(Database db) { this.db = db; }
    void close() { db.closed(); }
}
