import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class SeatRaceDemo {
    public static void main(String[] args) throws InterruptedException {
        Holds holds = new Holds();
        AtomicInteger winners = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        for (int u = 0; u < 8; u++) {
            String user = "user" + u; // all eight want the same two seats
            pool.submit(() -> {
                if (holds.holdAll(user, List.of("C4", "C5"))) {
                    winners.incrementAndGet();
                }
            });
        }
        pool.shutdown();
        if (!pool.awaitTermination(10, TimeUnit.SECONDS))
            throw new IllegalStateException("timed out");
        System.out.println("winners: " + winners.get());
        System.out.println("seats held: " + holds.count());
    }
}

final class Holds {
    private final Map<String, String> holder = new HashMap<>(); // seat->user

    // all or nothing: check every seat, then take them, under one lock
    synchronized boolean holdAll(String user, List<String> seats) {
        for (String s : seats) if (holder.containsKey(s)) return false;
        for (String s : seats) holder.put(s, user);
        return true;
    }

    synchronized int count() { return holder.size(); }
}
