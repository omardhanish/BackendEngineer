import java.time.YearMonth;
import java.util.*;

public class AtmModel {
  public static void main(String[] args) {
    Card card = new Card("4111222233334444", "AC-1", YearMonth.of(2028, 3));
    System.out.println(card + ", expired in 2028-04? "
        + card.isExpiredIn(YearMonth.of(2028, 4)));
    Account account = new Account("AC-1", 500_000);
    account.debit(200_000);
    System.out.println(account);
    CashDispenser cash = new CashDispenser(
        Map.of(10_000L, 10, 50_000L, 4, 200_000L, 1));
    ATM atm = new ATM("ATM-7", cash);
    System.out.println(atm.id + " " + atm.state + " " + atm.dispenser);
    Transaction tx = new Transaction("TX-1", TransactionType.WITHDRAWAL,
        "AC-1", 200_000, TransactionStatus.COMPLETED);
    System.out.println(tx);

    try {
      account.debit(400_000);
    } catch (IllegalStateException e) {
      System.out.println("rejected: " + e.getMessage());
    }
    try {
      new Transaction("TX-2", TransactionType.WITHDRAWAL, "AC-1", 0,
          TransactionStatus.PENDING);
    } catch (IllegalArgumentException e) {
      System.out.println("rejected: " + e.getMessage());
    }
  }
}

enum ATMState { IDLE, CARD_INSERTED, AUTHENTICATED, DISPENSING,
  OUT_OF_SERVICE }
enum TransactionType { WITHDRAWAL, BALANCE_INQUIRY }
enum TransactionStatus { PENDING, COMPLETED, REVERSED, DECLINED }

record Card(String number, String accountId, YearMonth expiresIn) {
  boolean isExpiredIn(YearMonth month) { return month.isAfter(expiresIn); }
  public String toString() {   // never print the full card number
    return "card ****" + number.substring(number.length() - 4)
        + " -> " + accountId;
  }
}

final class Account {
  final String id;
  private long balanceMinor;
  Account(String id, long balanceMinor) {
    this.id = id; this.balanceMinor = balanceMinor;
  }
  void debit(long amountMinor) {
    if (amountMinor <= 0)
      throw new IllegalArgumentException("amount must be positive");
    if (amountMinor > balanceMinor) throw new IllegalStateException(
        "insufficient funds in " + id);
    balanceMinor -= amountMinor;
  }
  public String toString() { return id + " balance " + balanceMinor; }
}

record Transaction(String id, TransactionType type, String accountId,
    long amountMinor, TransactionStatus status) {
  Transaction {
    if (type == TransactionType.WITHDRAWAL && amountMinor <= 0)
      throw new IllegalArgumentException("withdrawal must be positive");
  }
  public String toString() {
    return id + " " + type + " " + amountMinor + " " + status;
  }
}

final class CashDispenser {
  // note value in minor units -> count, largest note first
  private final NavigableMap<Long, Integer> notes =
      new TreeMap<>(Comparator.reverseOrder());
  CashDispenser(Map<Long, Integer> initial) {
    initial.forEach((note, count) -> {
      if (count < 0) throw new IllegalArgumentException("negative count");
      notes.put(note, count);
    });
  }
  long totalMinor() {
    long sum = 0;
    for (var e : notes.entrySet()) sum += e.getKey() * e.getValue();
    return sum;
  }
  public String toString() {
    StringBuilder sb = new StringBuilder();
    notes.forEach((n, c) -> sb.append(n / 100).append('x').append(c)
        .append(' '));
    return sb + "total " + totalMinor();
  }
}

final class ATM {
  final String id;
  final CashDispenser dispenser;
  ATMState state = ATMState.IDLE;
  Card currentCard;               // 0..1 card inside the machine
  ATM(String id, CashDispenser dispenser) {
    this.id = id; this.dispenser = dispenser;
  }
}
