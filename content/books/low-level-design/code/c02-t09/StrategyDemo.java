import java.util.List;

public class StrategyDemo {
    public static void main(String[] args) {
        List<ShippingCost> options = List.of(
            new Standard(), new Express(), new FreeOver(50.0));
        for (ShippingCost rule : options) {
            Cart cart = new Cart(rule);
            System.out.println(rule.name() + " -> " + cart.total(40.0));
        }
    }
}

interface ShippingCost {
    double cost(double subtotal);
    String name();
}

record Standard() implements ShippingCost {
    public double cost(double subtotal) { return 4.0; }
    public String name() { return "standard"; }
}

record Express() implements ShippingCost {
    public double cost(double subtotal) { return 9.5; }
    public String name() { return "express"; }
}

record FreeOver(double limit) implements ShippingCost {
    public double cost(double subtotal) {
        return subtotal >= limit ? 0.0 : 4.0;
    }
    public String name() { return "free over " + limit; }
}

class Cart {
    private final ShippingCost shipping;

    Cart(ShippingCost shipping) { this.shipping = shipping; }

    double total(double subtotal) {
        return subtotal + shipping.cost(subtotal);
    }
}
