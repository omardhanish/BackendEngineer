import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class RaceDemo {
    public static void main(String[] args) throws Exception {
        RoomCalendar calendar = new RoomCalendar();
        AtomicInteger won = new AtomicInteger();
        CountDownLatch go = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(8);
        for (int i = 0; i < 8; i++) {
            String guest = "guest" + i;
            pool.submit(() -> {
                go.await(); // all eight start together
                if (calendar.tryBook("101", 10, 13, guest))
                    won.incrementAndGet();
                return null;
            });
        }
        go.countDown();
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("winners for 101: " + won.get());
        System.out.println("stored for 101: " + calendar.count("101"));
        System.out.println("102 same nights: "
                + calendar.tryBook("102", 10, 13, "late"));
    }
}

record Booking(String guest, int from, int to) { // nights [from, to)
    boolean overlaps(int f, int t) { return from < t && f < to; }
}

final class RoomCalendar {
    private final Map<String, List<Booking>> byRoom = new ConcurrentHashMap<>();
    private List<Booking> of(String room) {
        return byRoom.computeIfAbsent(room, k -> new ArrayList<>());
    }
    boolean tryBook(String room, int from, int to, String guest) {
        List<Booking> list = of(room);
        synchronized (list) { // lock this room only; check and add as one step
            for (Booking b : list) if (b.overlaps(from, to)) return false;
            list.add(new Booking(guest, from, to));
            return true;
        }
    }
    int count(String room) {
        List<Booking> list = of(room);
        synchronized (list) { return list.size(); }
    }
}
