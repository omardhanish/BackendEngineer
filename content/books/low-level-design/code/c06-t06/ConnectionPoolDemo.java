import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class ConnectionPoolDemo {
    public static void main(String[] args) throws Exception {
        ConnectionPool pool = new ConnectionPool(2);
        AtomicInteger inUse = new AtomicInteger();
        AtomicInteger peak = new AtomicInteger();
        ExecutorService workers = Executors.newFixedThreadPool(4);
        for (int i = 0; i < 8; i++) {
            String tenant = "tenant-" + i;
            workers.submit(() -> {
                PooledConnection c = pool.acquire(1000);
                try {
                    peak.accumulateAndGet(inUse.incrementAndGet(), Math::max);
                    c.useSchema(tenant);
                    Thread.sleep(10);
                } finally {
                    inUse.decrementAndGet();
                    pool.release(c);
                }
                return null;
            });
        }
        workers.shutdown();
        workers.awaitTermination(10, TimeUnit.SECONDS);
        System.out.println("connections created: " + pool.created());
        System.out.println("peak in use <= 2: " + (peak.get() <= 2));

        PooledConnection a = pool.acquire(50);
        PooledConnection b = pool.acquire(50);
        try {
            pool.acquire(50);
        } catch (IllegalStateException e) {
            System.out.println("third acquire: " + e.getMessage());
        }
        b.useSchema("tenant-x");
        pool.release(b);
        System.out.println("reused schema: " + pool.acquire(50).schema());
    }
}

final class ConnectionPool {
    private final BlockingQueue<PooledConnection> idle;
    private final AtomicInteger created = new AtomicInteger();

    ConnectionPool(int size) {
        if (size < 1) throw new IllegalArgumentException("size must be >= 1");
        idle = new ArrayBlockingQueue<>(size);
        for (int i = 0; i < size; i++) {
            idle.add(new PooledConnection(created.incrementAndGet()));
        }
    }

    PooledConnection acquire(long timeoutMs) throws InterruptedException {
        PooledConnection c = idle.poll(timeoutMs, TimeUnit.MILLISECONDS);
        if (c == null)
            throw new IllegalStateException("pool exhausted");
        return c;
    }

    void release(PooledConnection c) {
        c.reset(); // never hand out the last user's state
        if (!idle.offer(c))
            throw new IllegalStateException("released twice?");
    }

    int created() { return created.get(); }
}

final class PooledConnection {
    private final int id;
    private String schema = "public";

    PooledConnection(int id) { this.id = id; }
    void useSchema(String s) { schema = s; }
    String schema() { return schema; }
    void reset() { schema = "public"; }
}
