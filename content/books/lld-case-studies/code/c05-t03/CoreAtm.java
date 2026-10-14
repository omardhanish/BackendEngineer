import java.util.*;

public class CoreAtm {
  public static void main(String[] args) {
    BankService bank = new InMemoryBank(
        Map.of("4111222233334444", "AC-1"), Map.of("AC-1", 300_000L));
    CashDispenser cash = new CashDispenser(new GreedyPlanner(),
        Map.of(200_000L, 2, 50_000L, 4, 10_000L, 5));
    ATM atm = new ATM("ATM-7", bank, cash);

    atm.insertCard("4111222233334444");
    System.out.println("pin 0000: " + atm.enterPin("0000"));
    System.out.println("pin 1234: " + atm.enterPin("1234"));
    for (long amount : new long[] {260_000, 250_000, 900_000})
      System.out.println("withdraw " + amount + ": " + atm.withdraw(amount));
    System.out.println("balance " + bank.balance("AC-1") + ", " + cash);
  }
}

interface BankService {                         // the bank, over a network
  Optional<String> verifyPin(String cardNo, String pin);  // -> accountId
  long balance(String accountId);
  String debit(String accountId, long amountMinor);       // -> tx id
}

interface DispensePlanner {                     // which notes to give
  Optional<Map<Long, Integer>> plan(long amount,
      NavigableMap<Long, Integer> stock);
}

class GreedyPlanner implements DispensePlanner {
  public Optional<Map<Long, Integer>> plan(long amount,
      NavigableMap<Long, Integer> stock) {
    Map<Long, Integer> out = new LinkedHashMap<>();
    for (var e : stock.entrySet()) {          // largest note first
      int n = (int) Math.min(e.getValue(), amount / e.getKey());
      if (n > 0) { out.put(e.getKey(), n); amount -= n * e.getKey(); }
    }
    return amount == 0 ? Optional.of(out) : Optional.empty();
  }
}

class CashDispenser {
  private final DispensePlanner planner;
  private final NavigableMap<Long, Integer> stock =
      new TreeMap<>(Comparator.reverseOrder());
  CashDispenser(DispensePlanner planner, Map<Long, Integer> notes) {
    this.planner = planner; stock.putAll(notes);
  }
  Optional<Map<Long, Integer>> plan(long amount) {
    return planner.plan(amount, stock);
  }
  void dispense(Map<Long, Integer> notes) {
    notes.forEach((note, n) -> stock.merge(note, -n, Integer::sum));
  }
  public String toString() { return "notes left " + stock; }
}

class ATM {                                     // facade for the screen
  private final String id;
  private final BankService bank;
  private final CashDispenser cash;
  private String cardNo, accountId;
  ATM(String id, BankService bank, CashDispenser cash) {
    this.id = id; this.bank = bank; this.cash = cash;
  }
  void insertCard(String cardNo) { this.cardNo = cardNo; }
  boolean enterPin(String pin) {
    accountId = bank.verifyPin(cardNo, pin).orElse(null);
    return accountId != null;
  }
  String withdraw(long amount) {
    if (accountId == null) return "refused: not authenticated";
    Optional<Map<Long, Integer>> notes = cash.plan(amount);
    if (notes.isEmpty()) return "refused: ATM cannot make this amount";
    try {
      String txId = bank.debit(accountId, amount);  // money moves first
      cash.dispense(notes.get());                   // then notes move
      return txId + " notes " + notes.get();
    } catch (IllegalStateException e) {
      return "refused: " + e.getMessage();
    }
  }
}

class InMemoryBank implements BankService {
  private final Map<String, String> cards;
  private final Map<String, Long> balances;
  private int nextTx = 1;
  InMemoryBank(Map<String, String> cards, Map<String, Long> balances) {
    this.cards = cards; this.balances = new HashMap<>(balances);
  }
  public Optional<String> verifyPin(String cardNo, String pin) {
    return "1234".equals(pin)                     // demo only: real banks
        ? Optional.ofNullable(cards.get(cardNo))  // check a PIN hash
        : Optional.empty();
  }
  public long balance(String id) { return balances.get(id); }
  public synchronized String debit(String id, long amount) {
    if (balances.get(id) < amount)
      throw new IllegalStateException("insufficient funds");
    balances.put(id, balances.get(id) - amount);
    return "TX-" + nextTx++;
  }
}
