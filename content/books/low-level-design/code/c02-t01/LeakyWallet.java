import java.util.ArrayList;
import java.util.List;

public class LeakyWallet {
    public static void main(String[] args) {
        Wallet w = new Wallet();
        w.deposit(50);
        w.withdraw(20);
        System.out.println("Balance " + w.balance + ", log " + w.getLog());

        // Any caller can skip the rules: no method, no check.
        w.balance = -500;

        // The getter hands out the real list, so callers rewrite history.
        List<String> log = w.getLog();
        log.clear();
        log.add("deposit 1000");

        System.out.println("Balance " + w.balance + ", log " + w.getLog());
    }
}

// Rule: balance never goes negative; log records every change.
class Wallet {
    public int balance;
    private final List<String> log = new ArrayList<>();

    void deposit(int amount) {
        balance += amount;
        log.add("deposit " + amount);
    }

    void withdraw(int amount) {
        if (amount > balance) throw new IllegalStateException("low funds");
        balance -= amount;
        log.add("withdraw " + amount);
    }

    List<String> getLog() { return log; }
}
