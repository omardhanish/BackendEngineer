public class StateDemo {
    public static void main(String[] args) {
        Order order = new Order();
        order.ship();
        order.pay();
        order.cancel();
        order.pay();
        order.ship();
    }
}

interface OrderState {
    // Default: the action is not allowed here, so stay in this state.
    default OrderState pay()    { return this; }
    default OrderState ship()   { return this; }
    default OrderState cancel() { return this; }
    default String name() { return getClass().getSimpleName(); }
}

record Created() implements OrderState {
    public OrderState pay()    { return new Paid(); }
    public OrderState cancel() { return new Cancelled(); }
}
record Paid() implements OrderState {
    public OrderState ship()   { return new Shipped(); }
    public OrderState cancel() { return new Cancelled(); }
}
record Shipped() implements OrderState {}
record Cancelled() implements OrderState {}

class Order {
    private OrderState state = new Created();

    void pay()    { move("pay", state.pay()); }
    void ship()   { move("ship", state.ship()); }
    void cancel() { move("cancel", state.cancel()); }

    private void move(String action, OrderState next) {
        String result = next == state ? "refused" : "-> " + next.name();
        System.out.println(action + " in " + state.name() + ": " + result);
        state = next;
    }
}
