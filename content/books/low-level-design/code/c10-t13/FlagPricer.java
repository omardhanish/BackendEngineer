public class FlagPricer {
    public static void main(String[] args) {
        Pricer pricer = new Pricer();
        // A member: (price, member, coupon, holiday).
        long member = pricer.total(10_000, true, false, false);
        System.out.println("member pays " + member);
        // A coupon holder. The caller swapped the last two flags.
        long coupon = pricer.total(10_000, false, false, true);
        System.out.println("coupon holder pays " + coupon);
    }
}

// Each new rule adds a flag, a parameter and a branch to this method.
// Callers pass a row of booleans the compiler cannot tell apart.
class Pricer {
    long total(long cents, boolean member, boolean coupon,
               boolean holiday) {
        long price = cents;
        if (member) {
            price = price * 90 / 100;
        }
        if (coupon) {
            price = price - 1_500;
        }
        if (holiday) {
            price = price * 105 / 100;
        }
        return price;
    }
}
