import java.util.*;

public class Extensions {
    public static void main(String[] args) {
        long[] now = {0};
        Clock clock = () -> now[0];
        SchedulerConfig config = SchedulerConfig.builder()
            .defaultRetry(new ExponentialBackoff(100, 1000, 3))
            .build();
        Scheduler s = new Scheduler(clock, config);
        int[] calls = {0};
        s.submit(TaskSpec.named("sync-users").at(0)
            .every(new EndsAt(new FixedRate(300), 900))
            .job(new Logged("sync-users", clock, () -> { }))
            .build());
        s.submit(TaskSpec.named("send-email").at(100).priority(5)
            .retry(new JitteredBackoff(200, 2000, 4, 42L))
            .job(new Logged("send-email", clock, () -> {
                if (++calls[0] < 3) throw new Exception("smtp busy");
            }))
            .build());
        for (long t = 0; t <= 1500; t += 50) {
            now[0] = t;
            s.runDue();
        }
    }
}

// ---- New code added later: none of it edits Scheduler. ----
final class EndsAt implements Schedule {           // decorator: stop time
    private final Schedule inner;
    private final long endAt;
    EndsAt(Schedule inner, long endAt) {
        this.inner = inner; this.endAt = endAt;
    }
    public OptionalLong nextAfter(long last) {
        OptionalLong next = inner.nextAfter(last);
        return next.isPresent() && next.getAsLong() <= endAt
            ? next : OptionalLong.empty();
    }
}

final class JitteredBackoff implements RetryPolicy {   // seeded for tests
    private final long base, cap;
    private final int max;
    private final Random random;
    JitteredBackoff(long base, long cap, int max, long seed) {
        this.base = base; this.cap = cap; this.max = max;
        this.random = new Random(seed);
    }
    public int maxAttempts() { return max; }
    public long delayMillis(int attempt) {
        long d = Math.min(cap, base << Math.min(attempt - 1, 20));
        return d / 2 + (long) (random.nextDouble() * (d / 2));
    }
}

final class Logged implements Job {                  // decorator: logging
    private final String name;
    private final Clock clock;
    private final Job inner;
    Logged(String name, Clock clock, Job inner) {
        this.name = name; this.clock = clock; this.inner = inner;
    }
    public void run() throws Exception {
        try {
            inner.run();
            System.out.println("t=" + clock.nowMillis() + " " + name + " ok");
        } catch (Exception e) {
            System.out.println("t=" + clock.nowMillis() + " " + name
                + " failed: " + e.getMessage());
            throw e;                                 // keep retry behaviour
        }
    }
}

// ---- Core: trimmed copy of the core page (no cancel or status). ----
interface Job { void run() throws Exception; }
interface Clock { long nowMillis(); }
interface Schedule { OptionalLong nextAfter(long lastRunAt); }
interface RetryPolicy { int maxAttempts(); long delayMillis(int attempt); }

final class FixedRate implements Schedule {
    private final long period;
    FixedRate(long period) { this.period = period; }
    public OptionalLong nextAfter(long last) {
        return OptionalLong.of(last + period);
    }
}

final class ExponentialBackoff implements RetryPolicy {
    private final long base, cap;
    private final int max;
    ExponentialBackoff(long base, long cap, int max) {
        this.base = base; this.cap = cap; this.max = max;
    }
    public int maxAttempts() { return max; }
    public long delayMillis(int attempt) {
        return Math.min(cap, base << Math.min(attempt - 1, 20));
    }
}

final class SchedulerConfig {
    final RetryPolicy defaultRetry;
    private SchedulerConfig(Builder b) { defaultRetry = b.retry; }
    static Builder builder() { return new Builder(); }
    static final class Builder {
        private RetryPolicy retry = new ExponentialBackoff(1000, 60000, 5);
        Builder defaultRetry(RetryPolicy r) { retry = r; return this; }
        SchedulerConfig build() { return new SchedulerConfig(this); }
    }
}

final class TaskSpec {
    final String name; final long runAt; final int priority;
    final Schedule schedule; final RetryPolicy retry; final Job job;
    private TaskSpec(Builder b) {
        name = b.name; runAt = b.runAt; priority = b.priority;
        schedule = b.schedule; retry = b.retry; job = b.job;
    }
    static Builder named(String name) { return new Builder(name); }
    static final class Builder {
        private final String name;
        private long runAt; private int priority;
        private Schedule schedule = last -> OptionalLong.empty();
        private RetryPolicy retry;                   // null: use config
        private Job job;
        Builder(String name) { this.name = name; }
        Builder at(long t) { runAt = t; return this; }
        Builder priority(int p) { priority = p; return this; }
        Builder every(Schedule s) { schedule = s; return this; }
        Builder retry(RetryPolicy r) { retry = r; return this; }
        Builder job(Job j) { job = j; return this; }
        TaskSpec build() {
            if (job == null) throw new IllegalStateException("job required");
            return new TaskSpec(this);
        }
    }
}

record Entry(long runAt, long seq, TaskSpec spec, int attempts) { }

final class Scheduler {
    private final PriorityQueue<Entry> queue = new PriorityQueue<>(
        Comparator.comparingLong(Entry::runAt)
            .thenComparing(e -> e.spec().priority, Comparator.reverseOrder())
            .thenComparingLong(Entry::seq));
    private final Clock clock;
    private final SchedulerConfig config;
    private long seq;
    Scheduler(Clock clock, SchedulerConfig config) {
        this.clock = clock; this.config = config;
    }
    void submit(TaskSpec spec) {
        queue.add(new Entry(spec.runAt, ++seq, spec, 0));
    }
    void runDue() {
        long now = clock.nowMillis();
        while (!queue.isEmpty() && queue.peek().runAt() <= now) {
            Entry e = queue.poll();
            TaskSpec t = e.spec();
            RetryPolicy retry = t.retry != null ? t.retry : config.defaultRetry;
            try {
                t.job.run();
                t.schedule.nextAfter(e.runAt()).ifPresent(at ->
                    queue.add(new Entry(at, e.seq(), t, 0)));
            } catch (Exception ex) {
                int tried = e.attempts() + 1;
                if (tried < retry.maxAttempts()) {
                    long at = now + retry.delayMillis(tried);
                    queue.add(new Entry(at, e.seq(), t, tried));
                }
            }
        }
    }
}
