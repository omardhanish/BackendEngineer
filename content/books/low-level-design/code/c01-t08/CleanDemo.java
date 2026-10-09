public class CleanDemo {
    public static void main(String[] args) {
        ShippingQuote quote = new ShippingQuote();
        System.out.println(quote.costInPence(2, 1200, Tier.PREMIUM));
        System.out.println(quote.costInPence(5, 300, Tier.STANDARD));
        try {
            quote.costInPence(0, 900, Tier.STANDARD);
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}

enum Tier { STANDARD, PREMIUM }

class ShippingQuote {
    private static final int FREE_FROM_PENCE = 1000;
    private static final int BASE_PENCE = 250;
    private static final int PER_ITEM_PENCE = 40;

    int costInPence(int items, int orderTotalPence, Tier tier) {
        if (items <= 0) {
            throw new IllegalArgumentException("order has no items");
        }
        if (tier == Tier.PREMIUM || qualifiesForFreeShipping(orderTotalPence)) {
            return 0;
        }
        return BASE_PENCE + items * PER_ITEM_PENCE;
    }

    private boolean qualifiesForFreeShipping(int orderTotalPence) {
        return orderTotalPence >= FREE_FROM_PENCE;
    }
}
