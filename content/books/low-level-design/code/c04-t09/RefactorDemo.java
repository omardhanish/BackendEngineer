public class RefactorDemo {
    public static void main(String[] args) {
        int cases = 0, same = 0;
        for (String code : new String[] {"S", "P"})
            for (int age : new int[] {8, 11, 12, 40})
                for (boolean weekend : new boolean[] {false, true}) {
                    cases++;
                    long before = Legacy.price(code, age, weekend);
                    long after = Ticket.price(Seat.of(code), age, weekend);
                    if (before == after) same++;
                }
        System.out.println(same + " of " + cases + " cases unchanged");
        System.out.println(Ticket.price(Seat.PREMIUM, 30, true));
    }
}
class Legacy {                       // before: duplicated, magic numbers
    static long price(String t, int a, boolean w) {
        long p = 0;
        if (t.equals("S")) { p = 800; if (a < 12) p -= 300; if (w) p += 200; }
        if (t.equals("P")) { p = 1400; if (a < 12) p -= 300; if (w) p += 200; }
        return p;
    }
}

enum Seat {                          // after: data moved to where it belongs
    STANDARD(800), PREMIUM(1400);
    final long baseCents;
    Seat(long baseCents) { this.baseCents = baseCents; }
    static Seat of(String c) {       // unknown codes now fail loudly
        return switch (c) { case "S" -> STANDARD; case "P" -> PREMIUM;
            default -> throw new IllegalArgumentException(c); }; }
}

class Ticket {
    private static final int CHILD_UNDER = 12;
    private static final long CHILD_DISCOUNT = 300;
    private static final long WEEKEND_SURCHARGE = 200;
    static long price(Seat seat, int age, boolean weekend) {
        long surcharge = weekend ? WEEKEND_SURCHARGE : 0;
        return seat.baseCents - discount(age) + surcharge;
    }
    private static long discount(int age) {          // extracted method
        return age < CHILD_UNDER ? CHILD_DISCOUNT : 0;
    }
}
