import java.util.ArrayList;
import java.util.List;

public class WalletDemo {
    public static void main(String[] args) {
        Wallet w = new Wallet("ada");
        w.deposit(50);
        w.withdraw(20);
        try {
            w.history().clear();
        } catch (UnsupportedOperationException e) {
            System.out.println("history is read-only");
        }
        try {
            w.withdraw(500);
        } catch (IllegalStateException e) {
            System.out.println("rejected: " + e.getMessage());
        }
        System.out.println(w.owner() + " has " + w.balance());
        System.out.println(w.history());
    }
}

final class Wallet {
    private final String owner;
    private int balance;
    private final List<String> history = new ArrayList<>();

    Wallet(String owner) {
        if (owner == null || owner.isBlank())
            throw new IllegalArgumentException("owner is required");
        this.owner = owner;
    }

    void deposit(int amount) {
        requirePositive(amount);
        balance += amount;
        history.add("deposit " + amount);
    }

    void withdraw(int amount) {
        requirePositive(amount);
        if (amount > balance)
            throw new IllegalStateException(
                    "balance " + balance + " < " + amount);
        balance -= amount;
        history.add("withdraw " + amount);
    }

    String owner() { return owner; }
    int balance() { return balance; }
    List<String> history() { return List.copyOf(history); }

    private static void requirePositive(int amount) {
        if (amount <= 0)
            throw new IllegalArgumentException("amount must be > 0");
    }
}
