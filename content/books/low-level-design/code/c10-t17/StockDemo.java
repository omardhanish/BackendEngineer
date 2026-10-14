import java.util.ArrayList;
import java.util.List;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class StockDemo {
    public static void main(String[] args) throws InterruptedException {
        var stock = new Stock(100);
        List<Thread> buyers = new ArrayList<>();
        for (int t = 0; t < 8; t++) {
            String sku = "sku-" + (t % 3);
            buyers.add(new Thread(() -> {
                for (int i = 0; i < 20; i++) stock.tryReserve(sku);
            }));
        }
        for (Thread b : buyers) b.start();
        for (Thread b : buyers) b.join();
        System.out.println("sold=" + stock.sold()
            + " rejected=" + stock.rejected() + " left=" + stock.left());
        System.out.println("requests=" + stock.requestsSorted());
    }
}

final class Stock {
    private final AtomicInteger left;
    private final AtomicInteger rejected = new AtomicInteger();
    private final int initial;
    private final ConcurrentHashMap<String, Integer> requests =
        new ConcurrentHashMap<>();

    Stock(int initial) {
        if (initial < 0) throw new IllegalArgumentException("initial < 0");
        this.initial = initial;
        this.left = new AtomicInteger(initial);
    }

    boolean tryReserve(String sku) {
        requests.merge(sku, 1, Integer::sum);       // atomic per key
        while (true) {
            int cur = left.get();
            if (cur == 0) { rejected.incrementAndGet(); return false; }
            if (left.compareAndSet(cur, cur - 1)) return true;
            // another thread changed it first: read again and retry
        }
    }

    int left() { return left.get(); }
    int sold() { return initial - left.get(); }
    int rejected() { return rejected.get(); }
    TreeMap<String, Integer> requestsSorted() {
        return new TreeMap<>(requests);
    }
}
