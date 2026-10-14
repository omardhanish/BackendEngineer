public class ShippingSwitch {
    public static void main(String[] args) {
        ShippingCalculator calc = new ShippingCalculator();
        System.out.println("standard 2kg: " + calc.cost("standard", 2.0));
        System.out.println("express  2kg: " + calc.cost("express", 2.0));
        System.out.println("pickup   2kg: " + calc.cost("pickup", 2.0));
        // A caller sends "Express". No error, just the wrong price.
        System.out.println("Express  2kg: " + calc.cost("Express", 2.0));
    }
}

// Every new delivery method means editing and retesting this class.
final class ShippingCalculator {
    long cost(String method, double kg) { // returns cents
        if (method.equals("express")) {
            long base = 1500;
            return base + Math.round(kg * 400);
        } else if (method.equals("pickup")) {
            return 0;
        } else if (method.equals("drone") && kg <= 2.5) {
            return 900;
        } else {
            // "standard" lands here, and so does any typo
            return 500 + Math.round(kg * 150);
        }
    }
}
