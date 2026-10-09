import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class SingletonDemo {
    public static void main(String[] args) {
        Sequence a = Sequence.get();
        Sequence b = Sequence.get();
        System.out.println("same object: " + (a == b));
        System.out.println(a.next() + ", " + b.next() + ", " + a.next());

        Settings.INSTANCE.put("region", "eu-west");
        System.out.println("region = " + Settings.INSTANCE.get("region"));
    }
}

final class Sequence {
    private int value;

    private Sequence() { }

    private static class Holder {
        static final Sequence INSTANCE = new Sequence();
    }

    static Sequence get() { return Holder.INSTANCE; }

    synchronized int next() { return ++value; }
}

enum Settings {
    INSTANCE;

    private final Map<String, String> values = new ConcurrentHashMap<>();

    void put(String key, String value) { values.put(key, value); }

    String get(String key) { return values.get(key); }
}
