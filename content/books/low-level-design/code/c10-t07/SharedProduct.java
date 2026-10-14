import java.util.Objects;

public class SharedProduct {
    public static void main(String[] args) {
        var mug = new Product("MUG-1", "Blue mug");
        var shop = new ShopPage();
        var goodsIn = new GoodsIn();
        mug.setPrice(999);                // sales team: what customers pay
        System.out.println("shop: " + shop.label(mug));
        goodsIn.receive(mug, 50, 400);    // warehouse team: what we paid
        System.out.println("stock: " + mug.onHand());
        System.out.println("shop: " + shop.label(mug));
    }
}
// One model for the whole company. "price" means two things here.
final class Product {
    private final String sku;
    private final String name;
    private long price;        // list price? unit cost? both teams write it
    private int onHand;
    Product(String sku, String name) {
        this.sku = Objects.requireNonNull(sku);
        this.name = Objects.requireNonNull(name);
    }
    String name() { return name; }
    long price() { return price; }
    int onHand() { return onHand; }
    void setPrice(long cents) { price = cents; }
    void addStock(int qty) { onHand += qty; }
}
// Sales code reads price as the list price.
final class ShopPage {
    String label(Product p) {
        return p.name() + " " + p.price() / 100 + "."
                + String.format("%02d", p.price() % 100);
    }
}
// Warehouse code writes the supplier's unit cost into the same field.
final class GoodsIn {
    void receive(Product p, int qty, long unitCostCents) {
        if (qty <= 0) throw new IllegalArgumentException("qty must be > 0");
        p.addStock(qty);
        p.setPrice(unitCostCents);
    }
}
