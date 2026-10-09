public class ProxyDemo {
    public static void main(String[] args) {
        Reports forIntern = new ReportsProxy("intern");
        Reports forAnalyst = new ReportsProxy("analyst");
        System.out.println(forIntern.read("payroll"));
        System.out.println(forAnalyst.read("payroll"));
        System.out.println(forAnalyst.read("sales"));
    }
}

interface Reports {
    String read(String name);
}

class ArchiveReports implements Reports {
    ArchiveReports() {
        System.out.println("  (opening the report archive)");
    }

    public String read(String name) { return "report: " + name; }
}

class ReportsProxy implements Reports {
    private final String role;
    private Reports real; // built on the first allowed call

    ReportsProxy(String role) { this.role = role; }

    public String read(String name) {
        if (!role.equals("analyst")) return "denied for " + role;
        if (real == null) real = new ArchiveReports();
        return real.read(name);
    }
}
