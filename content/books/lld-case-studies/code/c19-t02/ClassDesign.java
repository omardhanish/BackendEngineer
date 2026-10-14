import java.util.Comparator;
import java.util.OptionalLong;
import java.util.PriorityQueue;

public class ClassDesign {
    public static void main(String[] args) {
        Job noop = () -> { };
        RetryPolicy retry = new ExponentialBackoff(100, 1000, 6);
        PriorityQueue<Task> queue = new PriorityQueue<>(Task.RUN_ORDER);
        queue.add(new Task("T-1", "send-report", noop, 1000, 1,
            OneShot.INSTANCE, retry, 1));
        queue.add(new Task("T-2", "heartbeat", noop, 0, 0,
            new FixedRate(500), retry, 2));
        queue.add(new Task("T-3", "charge-card", noop, 1000, 5,
            OneShot.INSTANCE, retry, 3));
        while (!queue.isEmpty()) {
            Task t = queue.poll();
            System.out.println(t.id + " " + t.name + " at=" + t.runAtMillis()
                + " p=" + t.priority);
        }
        System.out.print("backoff:");
        for (int attempt = 1; attempt <= 5; attempt++) {
            System.out.print(" " + retry.delayMillis(attempt));
        }
        System.out.println();
        System.out.println("heartbeat next: "
            + new FixedRate(500).nextAfter(0).getAsLong());
        Task t = new Task("T-4", "one-off", noop, 0, 0,
            OneShot.INSTANCE, retry, 4);
        t.moveTo(TaskStatus.RUNNING);
        t.moveTo(TaskStatus.SUCCEEDED);
        try {
            t.moveTo(TaskStatus.RUNNING);
        } catch (IllegalStateException e) {
            System.out.println("refused: " + e.getMessage());
        }
    }
}

@FunctionalInterface
interface Job { void run() throws Exception; }        // the work itself

interface Clock { long nowMillis(); }                 // injected time

interface Schedule { OptionalLong nextAfter(long lastRunAt); }

interface RetryPolicy {
    int maxAttempts();
    long delayMillis(int attempt);                    // attempt is 1-based
}

enum TaskStatus {
    SCHEDULED, RUNNING, SUCCEEDED, FAILED, CANCELLED;
    boolean canMoveTo(TaskStatus next) {
        switch (this) {
            case SCHEDULED: return next == RUNNING || next == CANCELLED;
            case RUNNING: return next == SCHEDULED || next == SUCCEEDED
                || next == FAILED;
            default: return false;                    // terminal states
        }
    }
}

final class Task {
    static final Comparator<Task> RUN_ORDER = Comparator
        .comparingLong(Task::runAtMillis)
        .thenComparing(t -> t.priority, Comparator.reverseOrder())
        .thenComparingLong(t -> t.seq);               // FIFO on full tie
    final String id;
    final String name;
    final Job job;
    final int priority;
    final Schedule schedule;
    final RetryPolicy retry;
    final long seq;
    private long runAtMillis;                         // changes on requeue
    private TaskStatus status = TaskStatus.SCHEDULED;
    int attempts;

    Task(String id, String name, Job job, long runAtMillis, int priority,
         Schedule schedule, RetryPolicy retry, long seq) {
        if (priority < 0) throw new IllegalArgumentException("priority");
        this.id = id; this.name = name; this.job = job;
        this.runAtMillis = runAtMillis; this.priority = priority;
        this.schedule = schedule; this.retry = retry; this.seq = seq;
    }
    long runAtMillis() { return runAtMillis; }
    TaskStatus status() { return status; }
    void requeueAt(long at) { moveTo(TaskStatus.SCHEDULED); runAtMillis = at; }
    void moveTo(TaskStatus next) {
        if (!status.canMoveTo(next)) {
            throw new IllegalStateException(id + " " + status + " -> " + next);
        }
        status = next;
    }
}

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

final class ExponentialBackoff implements RetryPolicy {
    private final long baseMillis, capMillis;
    private final int maxAttempts;
    ExponentialBackoff(long baseMillis, long capMillis, int maxAttempts) {
        this.baseMillis = baseMillis; this.capMillis = capMillis;
        this.maxAttempts = maxAttempts;
    }
    public int maxAttempts() { return maxAttempts; }
    public long delayMillis(int attempt) {
        long d = baseMillis << Math.min(attempt - 1, 20);  // no overflow
        return Math.min(d, capMillis);
    }
}
