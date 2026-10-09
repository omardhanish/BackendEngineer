import java.util.concurrent.locks.ReentrantLock;

public class TransferDemo {
    public static void main(String[] args) throws InterruptedException {
        Account a = new Account(1, 1000);
        Account b = new Account(2, 1000);
        Thread t1 = new Thread(() -> repeat(a, b));
        Thread t2 = new Thread(() -> repeat(b, a));
        t1.start(); t2.start();
        t1.join(); t2.join(); // wait, so the result is final
        System.out.println("a=" + a.balance() + " b=" + b.balance());
    }

    static void repeat(Account from, Account to) {
        for (int i = 0; i < 10_000; i++) Bank.transfer(from, to, 1);
    }
}

final class Account {
    final int id;
    final ReentrantLock lock = new ReentrantLock();
    private long balance; // guarded by lock

    Account(int id, long balance) { this.id = id; this.balance = balance; }
    long balance() {
        lock.lock();
        try { return balance; } finally { lock.unlock(); }
    }
    void add(long amount) { balance += amount; } // caller holds lock
}

final class Bank {
    // Always lock the lower id first: no two threads wait in a circle.
    static void transfer(Account from, Account to, long amount) {
        Account first = from.id < to.id ? from : to;
        Account second = first == from ? to : from;
        first.lock.lock();
        try {
            second.lock.lock();
            try { from.add(-amount); to.add(amount); }
            finally { second.lock.unlock(); }
        } finally { first.lock.unlock(); }
    }
}
