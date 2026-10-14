public class RefundIfChain {
    public static void main(String[] args) {
        RefundService service = new RefundService();
        System.out.println("R-1 -> " + service.decide(30, false));
        System.out.println("R-2 -> " + service.decide(40, true));
        System.out.println("R-3 -> " + service.decide(320, false));
        System.out.println("R-4 -> " + service.decide(9_000, false));
    }
}

// Every rule lives in one method that knows every approver.
final class RefundService {
    String decide(long amount, boolean flagged) {
        if (amount <= 0) throw new IllegalArgumentException("amount");
        if (amount <= 50) {
            return "APPROVED by auto";      // returns before fraud check
        } else if (flagged) {
            return "HELD for fraud review";
        } else if (amount <= 500) {
            return "APPROVED by agent";
        } else if (amount <= 5_000) {
            return "APPROVED by finance";
        }
        return "REJECTED";
    }
    // A new rule (VIP, region, weekend) means editing this method again.
}
