import java.util.List;

public class TelescopingProblem {
    public static void main(String[] args) {
        // Order is (name, retries, timeoutSec): two ints side by side.
        JobConfig ok = new JobConfig("sync-orders", 3, 30);
        JobConfig swapped = new JobConfig("sync-users", 30, 3);
        System.out.println(ok);
        System.out.println(swapped + "   <- swapped, still compiles");

        // JavaBeans style: the object exists before it is valid.
        BeanJob bean = new BeanJob();
        System.out.println("half-built: " + bean.describe());
        bean.setName("report");
        bean.setTimeoutSec(-5);
        System.out.println("invalid, no error: " + bean.describe());
    }
}

class JobConfig {
    private final String name;
    private final int retries;
    private final int timeoutSec;
    private final List<String> tags;

    JobConfig(String name) { this(name, 0); }
    JobConfig(String name, int retries) { this(name, retries, 60); }
    JobConfig(String name, int retries, int timeoutSec) {
        this(name, retries, timeoutSec, List.of());
    }
    JobConfig(String name, int retries, int timeoutSec, List<String> tags) {
        this.name = name;
        this.retries = retries;
        this.timeoutSec = timeoutSec;
        this.tags = tags;
    }

    @Override
    public String toString() {
        return name + " retries=" + retries + " timeout=" + timeoutSec + "s";
    }
}

class BeanJob {
    private String name;
    private int timeoutSec = 60;

    void setName(String name) { this.name = name; }
    void setTimeoutSec(int timeoutSec) { this.timeoutSec = timeoutSec; }
    String describe() { return name + " timeout=" + timeoutSec + "s"; }
}
