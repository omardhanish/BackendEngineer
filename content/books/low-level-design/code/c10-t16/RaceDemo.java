import java.util.concurrent.CountDownLatch;

public class RaceDemo {
    public static void main(String[] args) throws InterruptedException {
        var aChecked = new CountDownLatch(1);
        var bDone = new CountDownLatch(1);
        var unsafe = new UnsafeWallet(100);
        Thread a = new Thread(() -> unsafe.withdraw(80, () -> {
            aChecked.countDown();      // A has passed the balance check...
            await(bDone);              // ...and pauses before it writes
        }));
        Thread b = new Thread(() -> {
            await(aChecked);
            unsafe.withdraw(80, () -> { });
            bDone.countDown();
        });
        a.start(); b.start(); a.join(); b.join();
        System.out.println("unsafe: paid=" + unsafe.paid()
            + " balance=" + unsafe.balance());

        var safe = new SafeWallet(100);
        Thread c = new Thread(() -> safe.withdraw(80));
        Thread d = new Thread(() -> safe.withdraw(80));
        c.start(); d.start(); c.join(); d.join();
        System.out.println("safe:   paid=" + safe.paid()
            + " balance=" + safe.balance());
    }

    static void await(CountDownLatch latch) {
        try { latch.await(); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}

class UnsafeWallet {                       // NOT thread-safe
    private int balance;
    private int paid;
    UnsafeWallet(int balance) { this.balance = balance; }

    void withdraw(int amount, Runnable betweenCheckAndAct) {
        if (balance >= amount) {           // check
            betweenCheckAndAct.run();      // another thread can run here
            balance -= amount;             // act on a stale decision
            paid += amount;
        }
    }
    int balance() { return balance; }
    int paid() { return paid; }
}

class SafeWallet {                         // guarded by "this"
    private int balance;
    private int paid;
    SafeWallet(int balance) { this.balance = balance; }

    synchronized boolean withdraw(int amount) {
        if (amount <= 0) throw new IllegalArgumentException("amount <= 0");
        if (balance < amount) return false;  // check and act: one lock
        balance -= amount;
        paid += amount;
        return true;
    }
    synchronized int balance() { return balance; }
    synchronized int paid() { return paid; }
}
