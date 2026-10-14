import java.util.List;

public class PaymentFees {
    public static void main(String[] args) {
        var fees = new FeeCalculator();
        // Product added "wallet" to the checkout menu last sprint.
        for (String method : List.of("card", "bank", "wallet")) {
            long fee = fees.feeCents(method, 10_000);
            System.out.println(method + ": " + money(fee));
        }
    }

    static String money(long cents) {
        return String.format("%d.%02d", cents / 100, cents % 100);
    }
}

// Every new payment method means reopening this method.
class FeeCalculator {
    long feeCents(String method, long amountCents) {
        if (amountCents <= 0)
            throw new IllegalArgumentException("amount must be > 0");
        if (method.equals("bank")) {
            return 50;
        } else if (method.equals("card")) {
            return 30 + amountCents * 290 / 10_000;
        }
        // Nobody added a "wallet" branch, so it falls to the card price.
        return 30 + amountCents * 290 / 10_000;
    }
}
