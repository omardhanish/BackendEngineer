public class RenewalSmells {
    public static void main(String[] args) {
        // Ada is 22 and renews her gym membership for 3 months.
        System.out.println(Renewals.renew("Ada", 22, 3));
        System.out.println(Receipts.line("Ada", 22, 3));
        // Another caller passes a negative term by mistake.
        System.out.println(Renewals.renew("Ada", 22, -3));
    }
}

class Renewals {
    // Long method: comments mark the steps it should be split into.
    static String renew(String name, int age, int months) {
        // 1. base price
        long cents = 4000L * months;
        // 2. student discount (raised to 20% last month)
        if (age < 26) {
            cents = cents - cents * 20 / 100;
        }
        // 3. format the amount
        String amount = cents / 100 + "."
                + String.format("%02d", Math.abs(cents % 100));
        // 4. build the message
        return name + " renews " + months + " months: " + amount;
    }
}

// The same rule copied into a second class. The 20% change missed it.
class Receipts {
    static String line(String name, int age, int months) {
        long cents = 4000L * months;
        if (age < 26) {
            cents = cents - cents * 15 / 100;
        }
        return "receipt for " + name + ": " + cents / 100 + "."
                + String.format("%02d", cents % 100);
    }
}
