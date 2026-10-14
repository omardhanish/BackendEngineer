import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class LooseInventory {
    public static void main(String[] args) {
        var inv = new Inventory();
        inv.stock.put("SKU-1", 5);
        inv.reserve("SKU-1", "ORD-7", 3, true);   // order and sku swapped
        inv.reserve("ORD-8", "SKU-1", -2, false); // negative quantity
        System.out.println("stock: " + inv.stock);
        try {
            System.out.println(inv.find("ORD-9").length());
        } catch (NullPointerException e) {
            System.out.println("find returned null -> NullPointerException");
        }
        inv.reservations().clear();               // caller wipes history
        System.out.println("ORD-8 after clear: " + inv.find("ORD-8"));
    }
}

class Inventory {
    public Map<String, Integer> stock = new LinkedHashMap<>();
    private final List<String> reservations = new ArrayList<>();

    // Two Strings, an int and a bare boolean: easy to call wrongly.
    void reserve(String orderId, String sku, int qty, boolean force) {
        int left = stock.getOrDefault(sku, 0) - qty;
        if (left < 0 && !force) return;           // fails silently
        stock.put(sku, left);
        reservations.add(orderId + ":" + sku + " x" + qty);
    }
    String find(String orderId) {
        for (String r : reservations)
            if (r.startsWith(orderId + ":")) return r;
        return null;
    }
    List<String> reservations() { return reservations; } // leaks the list
}
