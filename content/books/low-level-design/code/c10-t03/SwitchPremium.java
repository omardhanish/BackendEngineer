public class SwitchPremium {
    public static void main(String[] args) {
        QuoteDesk desk = new QuoteDesk();
        for (String cover : new String[] {"CAR", "HOME", "PET"}) {
            long cents = desk.premiumCents(cover, 20);
            System.out.println(cover + " cover, 20k insured: " + cents);
        }
    }
}

// The quote desk knows every cover's pricing rule.
class QuoteDesk {
    long premiumCents(String cover, int insuredK) {
        switch (cover) {
            case "CAR":
                return 30_000 + 1_500L * insuredK;
            case "HOME":
                return 12_000 + 400L * insuredK;
            // PET cover launched last sprint.
            // Nobody remembered this switch, and it has twins elsewhere.
            default:
                return 0;
        }
    }
}
