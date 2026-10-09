public class SolidDemo {
    public static void main(String[] args) {
        Checkout checkout = new Checkout(new ConsoleReceipt());
        checkout.pay(1200, new CardPayment());
        checkout.pay(450, new WalletPayment(500));
        checkout.pay(900, new WalletPayment(500));
    }
}

interface PaymentMethod {                 // DIP: Checkout needs only this
    boolean charge(long amount);          // false means declined
    String name();
}

record CardPayment() implements PaymentMethod {
    public boolean charge(long amount) { return true; }
    public String name() { return "card"; }
}

record WalletPayment(long balance) implements PaymentMethod { // OCP
    public boolean charge(long amount) { return amount <= balance; }
    public String name() { return "wallet"; }
}

interface Receipt {                       // ISP: one small role
    void print(String line);
}

class ConsoleReceipt implements Receipt {
    public void print(String line) { System.out.println(line); }
}

class Checkout {                          // SRP: only runs a payment
    private final Receipt receipt;

    Checkout(Receipt receipt) { this.receipt = receipt; }

    void pay(long amount, PaymentMethod method) {
        String result = method.charge(amount) ? "paid" : "declined";
        receipt.print(method.name() + " " + amount + ": " + result);
    }
}
