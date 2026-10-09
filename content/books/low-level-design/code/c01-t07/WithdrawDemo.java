import java.util.List;

public class WithdrawDemo {
    public static void main(String[] args) {
        Account account = new Account("A-1", 100);
        for (long amount : List.of(30L, 500L, -5L)) {
            try {
                account.withdraw(amount);
                System.out.println("ok, balance " + account.balance());
            } catch (AccountException e) {        // expected business case
                System.out.println(e.code() + ": " + e.getMessage());
            } catch (IllegalArgumentException e) { // a bug in the caller
                System.out.println("caller bug: " + e.getMessage());
            }
        }
    }
}

abstract class AccountException extends RuntimeException {
    AccountException(String message) { super(message); }
    abstract String code();                    // stable, machine-readable
}

class InsufficientFundsException extends AccountException {
    InsufficientFundsException(String id, long wanted, long held) {
        super(id + " wanted " + wanted + ", holds " + held);
    }
    @Override String code() { return "INSUFFICIENT_FUNDS"; }
}

class Account {
    private final String id;
    private long balance;
    Account(String id, long opening) { this.id = id; this.balance = opening; }
    long balance() { return balance; }
    void withdraw(long amount) {
        if (amount <= 0) {                      // fail fast on bad input
            throw new IllegalArgumentException("amount must be > 0: " + amount);
        }
        if (amount > balance) {
            throw new InsufficientFundsException(id, amount, balance);
        }
        balance -= amount;                      // state changes only if valid
    }
}
