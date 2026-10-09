public class AdapterDemo {
    public static void main(String[] args) {
        PaymentGateway gateway =
            new BankAdapter(new LegacyBankClient(), "GBP");
        System.out.println(gateway.pay("A-17", 12.5));
        System.out.println(gateway.pay("A-18", 0.0));
    }
}

interface PaymentGateway {
    String pay(String orderId, double amount);
}

// A vendor class we cannot edit: other names, units and results.
class LegacyBankClient {
    int submit(String reference, long minorUnits, String currency) {
        if (minorUnits <= 0) return 42;
        System.out.println("bank: " + minorUnits + " " + currency
            + " for " + reference);
        return 0;
    }
}

class BankAdapter implements PaymentGateway {
    private final LegacyBankClient bank;
    private final String currency;

    BankAdapter(LegacyBankClient bank, String currency) {
        this.bank = bank;
        this.currency = currency;
    }

    @Override
    public String pay(String orderId, double amount) {
        long minor = Math.round(amount * 100);
        int code = bank.submit(orderId, minor, currency);
        return code == 0 ? "PAID " + orderId
                         : "DECLINED " + orderId;
    }
}
