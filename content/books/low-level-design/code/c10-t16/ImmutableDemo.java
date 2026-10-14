import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicReference;

public class ImmutableDemo {
    public static void main(String[] args) throws InterruptedException {
        var tags = new ArrayList<>(List.of("eu", "gpu"));
        var v1 = new ServerConfig("api", 4, tags);
        tags.add("hacked");                  // the caller's list, not ours
        System.out.println("v1 = " + v1);
        try {
            v1.tags().add("x");
        } catch (UnsupportedOperationException e) {
            System.out.println("tags().add -> UnsupportedOperationException");
        }

        var current = new AtomicReference<>(v1);  // shared, swappable
        Thread[] admins = new Thread[4];
        for (int i = 0; i < admins.length; i++) {
            admins[i] = new Thread(() -> {
                for (int n = 0; n < 1000; n++) {
                    current.updateAndGet(c -> c.withWorkers(c.workers() + 1));
                }
            });
            admins[i].start();
        }
        for (Thread t : admins) t.join();
        System.out.println("latest workers = " + current.get().workers());
        System.out.println("v1 still = " + v1);
    }
}

record ServerConfig(String name, int workers, List<String> tags) {
    ServerConfig {                           // validate, then freeze
        Objects.requireNonNull(name, "name");
        if (workers < 1) throw new IllegalArgumentException("workers < 1");
        tags = List.copyOf(tags);            // defensive, unmodifiable copy
    }

    ServerConfig withWorkers(int newWorkers) {  // change = new object
        return new ServerConfig(name, newWorkers, tags);
    }
}
