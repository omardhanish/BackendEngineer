import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.*;

public class WorkerPool {
    public static void main(String[] args) throws Exception {
        ManualClock clock = new ManualClock();
        SafeScheduler s = new SafeScheduler(clock);
        Map<String, AtomicInteger> runs = new ConcurrentHashMap<>();
        CountDownLatch early = new CountDownLatch(1000);
        CountDownLatch late = new CountDownLatch(200);
        List<Thread> workers = new ArrayList<>();
        for (int w = 0; w < 4; w++) {
            Thread th = new Thread(() -> {
                Task t;
                while ((t = s.takeDue()) != null) {
                    t.job.run();               // outside the lock
                }
            });
            workers.add(th);
            th.start();
        }
        for (int i = 1; i <= 1200; i++) {
            String id = "T-" + i;
            boolean isLate = i > 1000;
            CountDownLatch done = isLate ? late : early;
            s.submit(new Task(id, isLate ? 5000 : 0, () -> {
                runs.computeIfAbsent(id, k -> new AtomicInteger())
                    .incrementAndGet();
                done.countDown();
            }));
        }
        early.await();
        System.out.println("ran at t=0: " + runs.size());
        clock.set(5000);
        s.wakeAll();                           // time moved: re-check heads
        late.await();
        s.shutdown();
        for (Thread th : workers) th.join();
        int max = 0;
        for (AtomicInteger n : runs.values()) max = Math.max(max, n.get());
        System.out.println("ran in total: " + runs.size()
            + ", most runs of one task: " + max);
    }
}

final class SafeScheduler {
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition changed = lock.newCondition();
    private final PriorityQueue<Task> queue = new PriorityQueue<>(
        Comparator.comparingLong((Task t) -> t.runAt));
    private final ManualClock clock;
    private boolean stopped;

    SafeScheduler(ManualClock clock) { this.clock = clock; }

    void submit(Task t) {
        lock.lock();
        try {
            queue.add(t);
            changed.signalAll();               // a new head may be due
        } finally {
            lock.unlock();
        }
    }

    // Blocks until a task is due; returns null after shutdown.
    Task takeDue() {
        lock.lock();
        try {
            while (!stopped) {
                Task head = queue.peek();
                if (head != null && head.runAt <= clock.nowMillis()) {
                    return queue.poll();       // peek and poll under one lock
                }
                // With a real clock: awaitNanos until head.runAt.
                changed.awaitUninterruptibly();
            }
            return null;
        } finally {
            lock.unlock();
        }
    }

    void wakeAll() {
        lock.lock();
        try { changed.signalAll(); } finally { lock.unlock(); }
    }

    void shutdown() {
        lock.lock();
        try { stopped = true; changed.signalAll(); } finally { lock.unlock(); }
    }
}

final class Task {
    final String id;
    final long runAt;
    final Runnable job;
    Task(String id, long runAt, Runnable job) {
        this.id = id; this.runAt = runAt; this.job = job;
    }
}

final class ManualClock {
    private volatile long now;
    void set(long millis) { now = millis; }
    long nowMillis() { return now; }
}
