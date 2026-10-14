import java.util.List;
import java.util.Objects;

public class PayrollAfter {
    public static void main(String[] args) {
        List<Employee> staff = List.of(
            new Employee("Lin", new Salaried(5_000),
                new BankAccount("DE44500105175407324931", "Nordbank")),
            new Employee("Raj", new Hourly(30, 170),
                new BankAccount("DE89370400440532013000", "Citybank")),
            new Employee("Mo", new Commissioned(2_000, 40_000),
                new BankAccount("DE02120300000000202051", "Nordbank")));
        staff.forEach(e -> System.out.println(e.payslip()));
    }
}

// Replace Conditional with Polymorphism: one type per pay rule.
sealed interface PayScheme permits Salaried, Hourly, Commissioned {
    long monthlyPay();
}

record Salaried(long monthly) implements PayScheme {
    public long monthlyPay() { return monthly; }
}

record Hourly(long rate, int hours) implements PayScheme {
    static final int STANDARD_HOURS = 160;

    public long monthlyPay() {
        int base = Math.min(hours, STANDARD_HOURS);
        int overtime = Math.max(0, hours - STANDARD_HOURS);
        return rate * base + rate * overtime * 3 / 2;
    }
}

record Commissioned(long base, long sales) implements PayScheme {
    public long monthlyPay() { return base + sales / 20; }
}

// Extract Class: the bank fields and their rules moved out together.
record BankAccount(String iban, String bank) {
    BankAccount {
        Objects.requireNonNull(bank, "bank");
        if (iban == null || iban.length() < 15) {
            throw new IllegalArgumentException("iban looks invalid");
        }
    }

    String masked() {
        return bank + " ****" + iban.substring(iban.length() - 4);
    }
}

record Employee(String name, PayScheme scheme, BankAccount account) {
    String payslip() {
        return name + ": " + scheme.monthlyPay() + " to " + account.masked();
    }
}
