public class DispatchRules {
    public static void main(String[] args) {
        Payment p = new CardPayment();   // static type Payment
        Auditor auditor = new Auditor();

        System.out.println(p.fee(1000));       // override: runtime type
        System.out.println(auditor.log(p));    // overload: static type
        System.out.println(auditor.log(new CardPayment()));
        System.out.println(p.kind());          // static: no dispatch
        System.out.println(p.name);            // fields: no dispatch
    }
}

class Payment {
    String name = "payment";
    long fee(long cents) { return 0; }
    static String kind() { return "Payment.kind"; }
}

class CardPayment extends Payment {
    String name = "card";                     // hides, does not override
    @Override long fee(long cents) { return cents * 2 / 100; }
    static String kind() { return "CardPayment.kind"; }
}

class Auditor {
    // Overloads: chosen by the compiler from the argument's static type.
    String log(Payment p) { return "log(Payment)"; }
    String log(CardPayment c) { return "log(CardPayment)"; }
}
