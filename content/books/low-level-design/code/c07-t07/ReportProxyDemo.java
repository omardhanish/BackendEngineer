import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.function.Supplier;

public class ReportProxyDemo {
    public static void main(String[] args) {
        Supplier<Reports> connect = Warehouse::new;
        Reports forIntern = new GuardedReports(new User("ivy", false), connect);
        try { forIntern.get("q1"); }
        catch (SecurityException e) { System.out.println(e.getMessage()); }

        Reports forAnalyst = new GuardedReports(new User("ana", true), connect);
        System.out.println(forAnalyst.get("q1"));
        System.out.println(forAnalyst.get("q1"));
        System.out.println(forAnalyst.get("q2"));
        System.out.println("warehouse queries: " + Warehouse.queries);
    }
}
record User(String name, boolean analyst) {}
interface Reports { String get(String reportId); }
final class Warehouse implements Reports {   // the real, expensive subject
    static int queries;
    Warehouse() { System.out.println("  connecting to warehouse..."); }
    @Override public String get(String reportId) {
        queries++;
        return "report " + reportId;
    }
}
final class GuardedReports implements Reports {   // the proxy
    private final User user;
    private final Supplier<Reports> factory;
    private final Map<String, String> cache = new HashMap<>();
    private Reports real;   // created on first allowed call
    GuardedReports(User user, Supplier<Reports> factory) {
        this.user = Objects.requireNonNull(user, "user");
        this.factory = Objects.requireNonNull(factory, "factory");
    }
    @Override public synchronized String get(String reportId) {
        if (!user.analyst())
            throw new SecurityException(user.name() + " may not read reports");
        String hit = cache.get(reportId);
        if (hit != null) { System.out.println("  cache hit"); return hit; }
        if (real == null) real = factory.get();
        String result = real.get(reportId);
        cache.put(reportId, result);
        return result;
    }
}
