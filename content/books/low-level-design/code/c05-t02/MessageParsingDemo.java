public class MessageParsingDemo {
    public static void main(String[] args) {
        PaymentGateway gateway = new PaymentGateway();
        for (int cents : new int[] {500, 90_000}) {
            try {
                gateway.charge(cents);
                System.out.println(cents + " -> 200 OK");
            } catch (RuntimeException e) {
                System.out.println(cents + " -> " + toStatus(e));
            }
        }
        System.out.println("Expected 90000 -> 402 card declined");
    }

    // The handler guesses the failure from the message text.
    static String toStatus(RuntimeException e) {
        if (e.getMessage().startsWith("Card declined")) {
            return "402 card declined";
        }
        return "500 internal error";
    }
}

class PaymentGateway {
    private static final int LIMIT_CENTS = 50_000;

    void charge(int cents) {
        if (cents > LIMIT_CENTS) {
            // A teammate reworded this message last sprint.
            throw new RuntimeException("Declined: card limit reached");
        }
    }
}
