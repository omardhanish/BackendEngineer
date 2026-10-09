public class ChainDemo {
    public static void main(String[] args) {
        RefundHandler chain =
            new AutoRefund(new AgentRefund(new ManagerReview()));
        for (double amount : new double[] {12.0, 150.0, 900.0}) {
            System.out.println(amount + " -> " + chain.handle(amount));
        }
    }
}

abstract class RefundHandler {
    private final RefundHandler next;

    RefundHandler(RefundHandler next) { this.next = next; }

    String handle(double amount) {
        return next == null ? "rejected" : next.handle(amount);
    }
}

class AutoRefund extends RefundHandler {
    AutoRefund(RefundHandler next) { super(next); }

    @Override String handle(double amount) {
        return amount <= 20 ? "auto refund" : super.handle(amount);
    }
}

class AgentRefund extends RefundHandler {
    AgentRefund(RefundHandler next) { super(next); }

    @Override String handle(double amount) {
        return amount <= 200 ? "agent refund" : super.handle(amount);
    }
}

class ManagerReview extends RefundHandler {
    ManagerReview() { super(null); }

    @Override String handle(double amount) {
        return "manager review";
    }
}
