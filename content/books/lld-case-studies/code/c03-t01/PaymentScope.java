import java.util.*;

public class PaymentScope {
  public static void main(String[] args) {
    Set<UseCase> v1 = EnumSet.of(UseCase.PAY_BY_UPI,
        UseCase.PAY_BY_CARD, UseCase.CHECK_STATUS, UseCase.RETRY_SAFELY,
        UseCase.REFUND, UseCase.CONFIRM_ASYNC, UseCase.RECONCILE);
    for (UseCase u : UseCase.values())
      System.out.printf("%-4s %-9s %s%n",
          v1.contains(u) ? "IN" : "OUT", u.actor, u);
    System.out.println("v1 covers " + v1.size() + " of "
        + UseCase.values().length + " use cases");
  }
}

enum Actor { CUSTOMER, MERCHANT, GATEWAY, SYSTEM }

enum UseCase {
  PAY_BY_UPI(Actor.CUSTOMER),
  PAY_BY_CARD(Actor.CUSTOMER),
  CHECK_STATUS(Actor.CUSTOMER),
  RETRY_SAFELY(Actor.CUSTOMER),
  REFUND(Actor.MERCHANT),
  CONFIRM_ASYNC(Actor.GATEWAY),
  RECONCILE(Actor.SYSTEM),
  SAVE_CARD(Actor.CUSTOMER),
  SPLIT_PAYOUT(Actor.MERCHANT),
  MULTI_CURRENCY(Actor.MERCHANT);

  final Actor actor;
  UseCase(Actor actor) { this.actor = actor; }
}
