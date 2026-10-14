public class PayrollBefore {
    public static void main(String[] args) {
        Employee lin = new Employee("Lin", "SALARIED", 5_000, 30, 170,
            0, "DE44500105175407324931", "Nordbank");
        Employee raj = new Employee("Raj", "HOURLY", 0, 30, 170,
            0, "DE89370400440532013000", "Citybank");
        System.out.println(lin.payslip());
        System.out.println(raj.payslip());
    }
}

// One class for every kind of worker, plus their bank details.
class Employee {
    final String name, kind, iban, bank;
    final long monthly, hourlyRate, sales;
    final int hours;

    Employee(String name, String kind, long monthly, long hourlyRate,
             int hours, long sales, String iban, String bank) {
        this.name = name; this.kind = kind; this.monthly = monthly;
        this.hourlyRate = hourlyRate; this.hours = hours;
        this.sales = sales; this.iban = iban; this.bank = bank;
    }

    long pay() {
        long pay = 0;
        if (kind.equals("SALARIED")) {
            pay = monthly;
        } else if (kind.equals("HOURLY")) {
            pay = hourlyRate * Math.min(hours, 160);
        } else if (kind.equals("COMMISSION")) {
            pay = monthly + sales / 20;
        }
        // Overtime was meant for hourly staff only.
        if (hours > 160) {
            pay += (hours - 160) * hourlyRate * 3 / 2;
        }
        return pay;
    }

    String payslip() {
        String tail = iban.substring(iban.length() - 4);
        return name + " (" + kind + "): " + pay() + " to " + bank
            + " ****" + tail;
    }
}
