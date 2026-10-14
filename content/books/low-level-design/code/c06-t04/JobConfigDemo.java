import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class JobConfigDemo {
    public static void main(String[] args) {
        JobConfig sync = JobConfig.builder("sync-orders")
                .retries(3).timeoutSec(30).tag("nightly").build();
        System.out.println(sync);
        System.out.println(JobConfig.builder("ping").build());

        JobConfig.Builder b = JobConfig.builder("report").tag("daily");
        JobConfig first = b.build();
        b.tag("urgent");
        System.out.println(first.tags() + " vs " + b.build().tags());

        try {
            JobConfig.builder("etl").retries(10).timeoutSec(120).build();
        } catch (IllegalStateException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}

final class JobConfig {
    private final String name;
    private final int retries;
    private final int timeoutSec;
    private final List<String> tags;

    private JobConfig(Builder b) {
        this.name = b.name;
        this.retries = b.retries;
        this.timeoutSec = b.timeoutSec;
        this.tags = List.copyOf(b.tags);
    }

    static Builder builder(String name) { return new Builder(name); }

    List<String> tags() { return tags; }

    @Override
    public String toString() {
        return name + " retries=" + retries + " timeout=" + timeoutSec
                + "s tags=" + tags;
    }

    static final class Builder {
        private final String name;
        private int retries = 0;
        private int timeoutSec = 60;
        private final List<String> tags = new ArrayList<>();

        private Builder(String name) {
            this.name = Objects.requireNonNull(name, "name");
        }

        Builder retries(int n) { this.retries = n; return this; }
        Builder timeoutSec(int s) { this.timeoutSec = s; return this; }
        Builder tag(String t) {
            tags.add(Objects.requireNonNull(t, "tag"));
            return this;
        }

        JobConfig build() {
            if (retries < 0 || retries > 10)
                throw new IllegalStateException("retries must be 0..10");
            if (timeoutSec <= 0)
                throw new IllegalStateException("timeoutSec must be > 0");
            int worst = timeoutSec * (retries + 1);
            if (worst > 600)
                throw new IllegalStateException(
                        "worst case " + worst + "s exceeds 600s");
            return new JobConfig(this);
        }
    }
}
