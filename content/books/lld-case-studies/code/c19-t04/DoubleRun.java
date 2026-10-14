import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

public class DoubleRun {
    public static void main(String[] args) throws Exception {
        System.out.println("check-then-act runs: " + race(false));
        System.out.println("compare-and-set runs: " + race(true));
    }

    // Two workers try to claim the same due task at the same moment.
    static int race(boolean useCas) throws Exception {
        AtomicReference<Status> status = new AtomicReference<>(
            Status.SCHEDULED);
        AtomicInteger runs = new AtomicInteger();
        CyclicBarrier together = new CyclicBarrier(2);
        Runnable worker = () -> {
            try {
                boolean mine;
                if (useCas) {
                    together.await();
                    mine = status.compareAndSet(
                        Status.SCHEDULED, Status.RUNNING);
                } else {
                    boolean free = status.get() == Status.SCHEDULED;
                    together.await();          // both have checked
                    if (free) status.set(Status.RUNNING);
                    mine = free;
                }
                if (mine) runs.incrementAndGet();   // the job runs here
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        };
        Thread a = new Thread(worker);
        Thread b = new Thread(worker);
        a.start(); b.start();
        a.join(); b.join();
        return runs.get();
    }
}

enum Status { SCHEDULED, RUNNING }
