import java.util.*;

public class DispenseFailure {
  public static void main(String[] args) {
    InMemoryBank bank = new InMemoryBank(500_000);  // account AC-1
    String tx = bank.debit("ATM-7/R-1", 200_000);
    System.out.println("debit " + tx + ", balance " + bank.balance());
    // The reply was lost. The ATM retries with the SAME request id.
    String again = bank.debit("ATM-7/R-1", 200_000);
    System.out.println("retry " + again + ", balance " + bank.balance());
    // The cassette jams: no notes left the machine. Reverse, twice.
    bank.reverse(tx);
    bank.reverse(tx);
    System.out.println(tx + " " + bank.status(tx)
        + ", balance " + bank.balance());
    System.out.println("late confirm: " + bank.confirm(tx));
  }
}

enum TransactionStatus { PENDING, COMPLETED, REVERSED }

class InMemoryBank {
  private long balance;
  private final Map<String, String> byRequest = new HashMap<>();
  private final Map<String, TransactionStatus> status = new HashMap<>();
  private final Map<String, Long> amount = new HashMap<>();
  private int nextTx = 1;
  InMemoryBank(long balance) { this.balance = balance; }

  synchronized String debit(String requestId, long amt) {
    String known = byRequest.get(requestId);
    if (known != null) return known;            // replay, no new debit
    if (balance < amt) throw new IllegalStateException("insufficient");
    balance -= amt;
    String tx = "TX-" + nextTx++;
    byRequest.put(requestId, tx);
    status.put(tx, TransactionStatus.PENDING);
    amount.put(tx, amt);
    return tx;
  }
  synchronized void reverse(String tx) {        // only PENDING reverses
    if (status.get(tx) != TransactionStatus.PENDING) return;
    balance += amount.get(tx);
    status.put(tx, TransactionStatus.REVERSED);
  }
  synchronized String confirm(String tx) {
    if (status.get(tx) != TransactionStatus.PENDING)
      return "refused, " + status(tx);
    status.put(tx, TransactionStatus.COMPLETED);
    return "ok";
  }
  synchronized TransactionStatus status(String tx) { return status.get(tx); }
  synchronized long balance() { return balance; }
}
