import java.util.*;

public class CoreScheduler {
    public static void main(String[] args) {
        ManualClock clock = new ManualClock();
        Scheduler s = new Scheduler(clock);
        RetryPolicy backoff = new ExponentialBackoff(100, 1000, 3);
        int[] cardCalls = {0};
        s.submit("charge-card", () -> {
            if (++cardCalls[0] < 3) throw new Exception("gateway timeout");
        }, 1000, 5, OneShot.INSTANCE, backoff);
        s.submit("send-report", () -> { }, 1000, 1, OneShot.INSTANCE, backoff);
        s.submit("heartbeat", () -> { }, 0, 0, new FixedRate(500), backoff);
        String old = s.submit("old-cleanup", () -> { }, 800, 0,
            OneShot.INSTANCE, backoff);
        s.submit("bad-export", () -> { throw new Exception("disk full"); },
            1500, 0, OneShot.INSTANCE, backoff);
        s.cancel(old);
        long[] ticks = {0, 500, 1000, 1100, 1300, 1500, 1700, 1900};
        for (long t : ticks) {
            clock.set(t);
            s.runDue();
        }
        s.cancel("T-3");                            // stop the heartbeat
        System.out.println(s.statusReport());
    }
}

final class Scheduler {
    private final Queue<Task> queue = new PriorityQueue<>(Task.RUN_ORDER);
    private final Map<String, Task> byId = new LinkedHashMap<>();
    private final Clock clock;
    private long seq;

    Scheduler(Clock clock) { this.clock = clock; }

    String submit(String name, Job job, long runAt, int priority,
                  Schedule schedule, RetryPolicy retry) {
        Task t = new Task("T-" + (++seq), name, job, runAt, priority,
            schedule, retry, seq);
        byId.put(t.id, t);
        queue.add(t);
        return t.id;
    }

    boolean cancel(String id) {             // lazy: the queue skips it later
        Task t = byId.get(id);
        if (t == null || t.status != TaskStatus.SCHEDULED) return false;
        t.moveTo(TaskStatus.CANCELLED);
        return true;
    }

    void runDue() {
        long now = clock.nowMillis();
        while (!queue.isEmpty() && queue.peek().runAtMillis <= now) {
            Task t = queue.poll();          // out of the heap before changes
            if (t.status == TaskStatus.CANCELLED) continue;
            execute(t, now);
        }
    }

    private void execute(Task t, long now) {
        t.moveTo(TaskStatus.RUNNING);
        t.attempts++;
        try {
            t.job.run();
            log(now, t, "ok");
            OptionalLong next = t.schedule.nextAfter(t.runAtMillis);
            if (next.isEmpty()) { t.moveTo(TaskStatus.SUCCEEDED); return; }
            t.attempts = 0;
            requeue(t, next.getAsLong());
        } catch (Exception e) {
            if (t.attempts >= t.retry.maxAttempts()) {
                t.moveTo(TaskStatus.FAILED);
                log(now, t, "failed for good: " + e.getMessage());
                return;
            }
            long at = now + t.retry.delayMillis(t.attempts);
            log(now, t, e.getMessage() + ", retry at " + at);
            requeue(t, at);
        }
    }

    private void requeue(Task t, long at) {
        t.moveTo(TaskStatus.SCHEDULED);     // check the move, then change
        t.runAtMillis = at;
        queue.add(t);
    }

    private void log(long now, Task t, String what) {
        System.out.println("t=" + now + " " + t.name + " #" + t.attempts
            + " " + what);
    }

    String statusReport() {
        StringBuilder sb = new StringBuilder();
        for (Task t : byId.values()) {
            sb.append(t.id).append(' ').append(t.name).append(' ')
              .append(t.status).append('\n');
        }
        return sb.toString().trim();
    }
}

final class Task {
    static final Comparator<Task> RUN_ORDER = Comparator
        .comparingLong((Task t) -> t.runAtMillis)
        .thenComparing(t -> t.priority, Comparator.reverseOrder())
        .thenComparingLong(t -> t.seq);
    final String id, name;
    final Job job;
    final int priority;
    final Schedule schedule;
    final RetryPolicy retry;
    final long seq;
    long runAtMillis;
    int attempts;
    TaskStatus status = TaskStatus.SCHEDULED;

    Task(String id, String name, Job job, long runAt, int priority,
         Schedule schedule, RetryPolicy retry, long seq) {
        this.id = id; this.name = name; this.job = job; runAtMillis = runAt;
        this.priority = priority; this.schedule = schedule;
        this.retry = retry; this.seq = seq;
    }

    void moveTo(TaskStatus next) {          // every status change goes here
        if (!status.canMoveTo(next)) {
            throw new IllegalStateException(id + " " + status + " -> " + next);
        }
        status = next;
    }
}

enum TaskStatus {
    SCHEDULED, RUNNING, SUCCEEDED, FAILED, CANCELLED;
    boolean canMoveTo(TaskStatus next) {
        switch (this) {
            case SCHEDULED: return next == RUNNING || next == CANCELLED;
            case RUNNING: return next == SCHEDULED || next == SUCCEEDED
                || next == FAILED;
            default: return false;          // terminal states
        }
    }
}

interface Job { void run() throws Exception; }

interface Clock { long nowMillis(); }

final class ManualClock implements Clock {
    private long now;
    void set(long millis) { now = millis; }
    public long nowMillis() { return now; }
}

interface Schedule { OptionalLong nextAfter(long lastRunAt); }

final class OneShot implements Schedule {
    static final OneShot INSTANCE = new OneShot();
    public OptionalLong nextAfter(long last) { return OptionalLong.empty(); }
}

final class FixedRate implements Schedule {
    private final long periodMillis;
    FixedRate(long periodMillis) { this.periodMillis = periodMillis; }
    public OptionalLong nextAfter(long last) {
        return OptionalLong.of(last + periodMillis);
    }
}

interface RetryPolicy { int maxAttempts(); long delayMillis(int attempt); }

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
