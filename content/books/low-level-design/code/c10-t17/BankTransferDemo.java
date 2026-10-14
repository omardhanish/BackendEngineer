import java.util.Objects;
import java.util.concurrent.locks.ReentrantLock;

public class BankTransferDemo {
    public static void main(String[] args) throws InterruptedException {
        var a = new Account(1, 100_000);
        var b = new Account(2, 100_000);
        Thread t1 = new Thread(() -> repeat(a, b, 3));
        Thread t2 = new Thread(() -> repeat(b, a, 2));
        t1.start(); t2.start();
        t1.join(); t2.join();
        System.out.println("A=" + a.balance() + " B=" + b.balance());
        System.out.println("total=" + (a.balance() + b.balance()));
        try {
            Account.transfer(a, b, 1_000_000);
        } catch (IllegalStateException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }

    static void repeat(Account from, Account to, long amount) {
        for (int i = 0; i < 1_000; i++) Account.transfer(from, to, amount);
    }
}

final class Account {
    private final int id;
    private final ReentrantLock lock = new ReentrantLock();
    private long balance; // guarded by lock

    Account(int id, long opening) { this.id = id; this.balance = opening; }

    long balance() {
        lock.lock();
        try { return balance; } finally { lock.unlock(); }
    }

    static void transfer(Account from, Account to, long amount) {
        Objects.requireNonNull(from); Objects.requireNonNull(to);
        if (from == to || amount <= 0)
            throw new IllegalArgumentException("bad transfer");
        Account first = from.id < to.id ? from : to;   // global lock order
        Account second = first == from ? to : from;
        first.lock.lock();
        try {
            second.lock.lock();
            try {
                if (from.balance < amount)
                    throw new IllegalStateException("insufficient funds");
                from.balance -= amount;
                to.balance += amount;
            } finally { second.lock.unlock(); }
        } finally { first.lock.unlock(); }
    }
}
