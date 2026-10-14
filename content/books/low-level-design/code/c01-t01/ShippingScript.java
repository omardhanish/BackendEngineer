public class ShippingScript {
    public static void main(String[] args) {
        System.out.println("STANDARD 2kg: " + feeCents("STANDARD", 2));
        System.out.println("express 2kg: " + feeCents("express", 2));
        System.out.println("EXPRESS -5kg: " + feeCents("EXPRESS", -5));
        System.out.println("SAME_DAY 1kg: " + feeCents("SAME_DAY", 1)
                + ", days " + days("SAME_DAY"));
    }

    // Every tariff for every option lives in one method, keyed by strings.
    static long feeCents(String method, int kg) {
        if (method.equals("STANDARD")) {
            return 400 + 150L * kg;
        } else if (method.equals("EXPRESS")) {
            return 900 + 250L * kg;
        } else if (method.equals("SAME_DAY")) {
            return 1500;
        }
        return 0; // unknown option: ships for free
    }

    // The same string keys again. Someone forgot SAME_DAY here.
    static int days(String method) {
        if (method.equals("STANDARD")) {
            return 4;
        } else if (method.equals("EXPRESS")) {
            return 1;
        }
        return 4;
    }
}
