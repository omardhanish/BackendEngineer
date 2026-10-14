import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class SingletonStylesDemo {
    public static void main(String[] args) throws InterruptedException {
        Set<Object> seen = ConcurrentHashMap.newKeySet();
        List<Thread> threads = new ArrayList<>();
        for (int i = 0; i < 8; i++) {          // 8 threads race to be first
            Thread t = new Thread(() -> {
                seen.add(HolderRegistry.getInstance());
                seen.add(LockedRegistry.getInstance());
                seen.add(EnumRegistry.INSTANCE);
            });
            threads.add(t);
            t.start();
        }
        for (Thread t : threads) t.join();
        System.out.println("distinct objects: " + seen.size());
        System.out.println("holder built " + HolderRegistry.BUILT.get());
        System.out.println("locked built " + LockedRegistry.BUILT.get());
        System.out.println(EnumRegistry.INSTANCE.urlOf("orders"));
        System.out.println(Runtime.getRuntime() == Runtime.getRuntime());
    }
}

// 1. Holder idiom: the JVM runs Holder's initialiser once, on first use.
final class HolderRegistry {
    static final AtomicInteger BUILT = new AtomicInteger();
    private HolderRegistry() { BUILT.incrementAndGet(); }
    private static final class Holder {
        static final HolderRegistry INSTANCE = new HolderRegistry();
    }
    static HolderRegistry getInstance() { return Holder.INSTANCE; }
}

// 2. Double-checked locking: correct only because the field is volatile.
final class LockedRegistry {
    static final AtomicInteger BUILT = new AtomicInteger();
    private static volatile LockedRegistry instance;
    private LockedRegistry() { BUILT.incrementAndGet(); }
    static LockedRegistry getInstance() {
        LockedRegistry local = instance;          // one volatile read
        if (local == null) {
            synchronized (LockedRegistry.class) {
                local = instance;                 // re-check under the lock
                if (local == null) instance = local = new LockedRegistry();
            }
        }
        return local;
    }
}

// 3. Enum: one instance, safe from reflection and deserialisation.
enum EnumRegistry {
    INSTANCE;
    private final Map<String, String> urls =
        Map.of("orders", "http://orders.internal:8080");
    String urlOf(String service) {
        String url = urls.get(service);
        if (url == null) throw new IllegalArgumentException(service);
        return url;
    }
}
