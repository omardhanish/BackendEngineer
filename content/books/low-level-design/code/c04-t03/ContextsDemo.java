public class ContextsDemo {
    public static void main(String[] args) {
        Buyer ana = new Buyer("C-7", "Ana", 2000, "12 Elm St");
        SalesOrder order = new SalesOrder("O-1", ana, 1500);
        System.out.println("within credit? " + order.withinCredit());

        Parcel parcel = ShippingTranslator.toParcel(order);
        System.out.println(parcel);
    }
}

// Sales context (records keep it short; Buyer, SalesOrder are entities)
record Buyer(String id, String name, long creditLimit, String address) {}

record SalesOrder(String id, Buyer buyer, long amount) {
    boolean withinCredit() { return amount <= buyer.creditLimit(); }
}

// Shipping context: the same person is only a name at an address
record Recipient(String name, String address) {}

record Parcel(String orderRef, Recipient to) {}

class ShippingTranslator {              // the one place the models meet
    static Parcel toParcel(SalesOrder order) {
        Buyer b = order.buyer();
        return new Parcel(order.id(), new Recipient(b.name(), b.address()));
    }
}
