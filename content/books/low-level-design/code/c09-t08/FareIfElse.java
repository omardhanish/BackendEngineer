public class FareIfElse {
    public static void main(String[] args) {
        System.out.println("SEDAN: " + fare(VehicleType.SEDAN, 8, 20, true));
        System.out.println("BIKE:  " + fare(VehicleType.BIKE, 8, 20, true));
        try {
            System.out.println("XL: " + fare(VehicleType.XL, 8, 20, false));
        } catch (IllegalArgumentException e) {
            System.out.println("XL failed: " + e.getMessage());
        }
    }

    // Every new vehicle, city, promo or surge rule edits this method.
    static long fare(VehicleType type, double km, int minutes, boolean surge) {
        long cents;
        if (type == VehicleType.BIKE) {
            cents = 50 + Math.round(km * 40);
            // surge forgotten here: bikes never surge, by accident
        } else if (type == VehicleType.SEDAN) {
            cents = 150 + Math.round(km * 90) + minutes * 20L;
            if (surge) cents = cents * 2;  // one fixed multiplier
        } else {
            throw new IllegalArgumentException("no price for " + type);
        }
        return cents;
    }
}

enum VehicleType { BIKE, SEDAN, XL } // XL was added last sprint
