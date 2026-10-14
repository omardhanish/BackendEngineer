import java.util.Map;
import java.util.TreeMap;

public class NaiveUndo {
    public static void main(String[] args) {
        StockScreen screen = new StockScreen();
        screen.add("bolt", 10);
        screen.remove("bolt", 4);
        screen.add("nut", 7);
        System.out.println("now:          " + screen.stock());
        screen.undo();
        System.out.println("after undo 1: " + screen.stock());
        screen.undo();
        System.out.println("after undo 2: " + screen.stock());
    }
}

// The screen calls the store directly and remembers only the last change.
final class StockScreen {
    private final Map<String, Integer> stock = new TreeMap<>();
    private String lastSku;
    private int lastDelta;

    void add(String sku, int qty) { change(sku, qty); }
    void remove(String sku, int qty) { change(sku, -qty); }

    private void change(String sku, int delta) {
        stock.merge(sku, delta, Integer::sum);
        lastSku = sku;                       // overwrites the older change
        lastDelta = delta;
    }
    void undo() {                            // undoes the same change again
        if (lastSku != null) stock.merge(lastSku, -lastDelta, Integer::sum);
    }
    Map<String, Integer> stock() { return stock; }
}
