public class WithdrawRules {
  static final long NOTE = 10_000;              // smallest note: Rs 100
  static final long PER_WITHDRAWAL = 1_000_000; // assumption: Rs 10,000
  static final long DAILY = 2_500_000;          // assumption: Rs 25,000

  public static void main(String[] args) {
    for (UseCase u : UseCase.values())
      System.out.println((u.inV1 ? "IN  " : "OUT ") + u.actor + ": " + u);
    long usedToday = 2_000_000;
    for (long amount : new long[] {50_000, 25_000, 1_200_000, 600_000})
      System.out.println("Rs " + amount / 100 + " -> "
          + check(amount, usedToday));
  }

  static String check(long amountMinor, long usedToday) {
    if (amountMinor <= 0) return "refused: amount must be positive";
    if (amountMinor % NOTE != 0) return "refused: not a multiple of Rs 100";
    if (amountMinor > PER_WITHDRAWAL)
      return "refused: over the per-withdrawal limit";
    if (usedToday + amountMinor > DAILY)
      return "refused: over the daily limit";
    return "ok";
  }
}

enum UseCase {
  AUTHENTICATE("Customer", true), CHECK_BALANCE("Customer", true),
  WITHDRAW_CASH("Customer", true), DEPOSIT_CASH("Customer", false),
  TRANSFER_FUNDS("Customer", false), REFILL_CASH("Operator", true),
  REVERSE_FAILED_DISPENSE("System", true);

  final String actor;
  final boolean inV1;
  UseCase(String actor, boolean inV1) {
    this.actor = actor; this.inV1 = inV1;
  }
}
