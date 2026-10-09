public class FacadeDemo {
    public static void main(String[] args) {
        Checkout checkout = new Checkout(
            new Stock(), new Payments(), new Courier());
        System.out.println(checkout.placeOrder("lamp", 25.0));
        System.out.println(checkout.placeOrder("sofa", 400.0));
    }
}

class Stock {
    boolean reserve(String item) {
        boolean ok = !item.equals("sofa");
        System.out.println("stock: " + item + (ok ? " reserved" : " none"));
        return ok;
    }
}

class Payments {
    String charge(double amount) {
        System.out.println("payments: charged " + amount);
        return "PAY-1";
    }
}

class Courier {
    String book(String item) {
        System.out.println("courier: pickup for " + item);
        return "TRK-9";
    }
}

class Checkout {
    private final Stock stock;
    private final Payments payments;
    private final Courier courier;
    Checkout(Stock stock, Payments payments, Courier courier) {
        this.stock = stock; this.payments = payments; this.courier = courier;
    }

    String placeOrder(String item, double amount) {
        if (!stock.reserve(item)) return "failed: out of stock";
        String pay = payments.charge(amount);
        return "placed: " + pay + " " + courier.book(item);
    }
}
