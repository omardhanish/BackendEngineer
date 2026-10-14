import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

public class BoundedPoolDemo {
    public static void main(String[] args) throws Exception {
        var gate = new CountDownLatch(1);         // keeps workers busy
        var pool = new ThreadPoolExecutor(
            2, 2,                                 // exactly 2 worker threads
            0L, TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(2),          // at most 2 waiting jobs
            new ThreadPoolExecutor.AbortPolicy()); // full? throw
        List<Future<Integer>> accepted = new ArrayList<>();
        for (int id = 1; id <= 5; id++) {
            int job = id;
            try {
                accepted.add(pool.submit(() -> {
                    gate.await();
                    return job * 10;
                }));
                System.out.println("job " + job + " accepted, queued="
                    + pool.getQueue().size());
            } catch (RejectedExecutionException e) {
                System.out.println("job " + job + " rejected: pool is full");
            }
        }
        gate.countDown();                         // release the workers
        List<Integer> results = new ArrayList<>();
        for (Future<Integer> f : accepted) results.add(f.get());
        System.out.println("results in submit order: " + results);

        pool.shutdown();                          // no new jobs, finish old
        boolean done = pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("terminated=" + done);
    }
}
