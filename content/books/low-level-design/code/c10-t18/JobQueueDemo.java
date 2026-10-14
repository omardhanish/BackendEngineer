import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class JobQueueDemo {
    static final int POISON = -1;                 // "no more jobs" marker
    static final int CONSUMERS = 3;

    public static void main(String[] args) throws InterruptedException {
        BlockingQueue<Integer> queue = new ArrayBlockingQueue<>(4);
        var handled = new AtomicInteger();
        var sum = new AtomicLong();
        // +1: the producer is a task too; only 4 tasks, so unbounded is fine
        ExecutorService pool = Executors.newFixedThreadPool(CONSUMERS + 1);

        pool.execute(() -> {                      // the producer
            try {
                for (int job = 1; job <= 20; job++) queue.put(job);
                for (int i = 0; i < CONSUMERS; i++) queue.put(POISON);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        for (int c = 0; c < CONSUMERS; c++) {
            pool.execute(() -> {                  // a consumer
                try {
                    while (true) {
                        int job = queue.take();   // blocks while empty
                        if (job == POISON) return;
                        sum.addAndGet(job);
                        handled.incrementAndGet();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        }
        pool.shutdown();
        if (!pool.awaitTermination(5, TimeUnit.SECONDS)) pool.shutdownNow();
        System.out.println("handled=" + handled.get() + " sum=" + sum.get()
            + " left in queue=" + queue.size());
    }
}
