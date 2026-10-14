import java.util.*;

public class CartScope {
  public static void main(String[] args) {
    Set<UseCase> v1 = EnumSet.of(UseCase.BROWSE, UseCase.EDIT_CART,
        UseCase.CHECKOUT, UseCase.PAY, UseCase.CANCEL_ORDER,
        UseCase.RELEASE_STOCK);
    for (UseCase u : UseCase.values())
      System.out.printf("%-3s %-7s %s%n", v1.contains(u) ? "IN" : "OUT",
          u.actor, u.text);
    Map<Actor, Integer> perActor = new EnumMap<>(Actor.class);
    for (UseCase u : v1) perActor.merge(u.actor, 1, Integer::sum);
    System.out.println("v1 use cases per actor: " + perActor);
  }
}

enum Actor { SHOPPER, SYSTEM, ADMIN }

enum UseCase {
  BROWSE(Actor.SHOPPER, "browse products and prices"),
  EDIT_CART(Actor.SHOPPER, "add, change or remove cart items"),
  CHECKOUT(Actor.SHOPPER, "price the cart, reserve stock, place order"),
  PAY(Actor.SHOPPER, "pay once for a placed order"),
  CANCEL_ORDER(Actor.SHOPPER, "cancel an order before it ships"),
  RELEASE_STOCK(Actor.SYSTEM, "free stock held by unpaid orders"),
  MANAGE_CATALOG(Actor.ADMIN, "edit products, prices and stock"),
  RETURNS(Actor.SHOPPER, "return a delivered item for a refund"),
  RECOMMEND(Actor.SYSTEM, "suggest related products");

  final Actor actor;
  final String text;
  UseCase(Actor actor, String text) { this.actor = actor; this.text = text; }
}
