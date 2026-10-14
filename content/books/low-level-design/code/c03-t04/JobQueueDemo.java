import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class JobQueueDemo {
    public static void main(String[] args) {
        submitAll(new UnboundedJobQueue());
        submitAll(new BoundedJobQueue(2));
    }

    // Correct for ANY JobQueue: it relies only on the contract.
    static void submitAll(JobQueue queue) {
        List<String> retry = new ArrayList<>();
        for (String job : List.of("email", "invoice", "backup")) {
            if (!queue.offer(job)) retry.add(job);
        }
        System.out.println(queue.getClass().getSimpleName() + " ran "
                + queue.drain() + ", retry later " + retry);
    }
}

/**
 * Contract: offer() returns true if the job runs on the next drain(),
 * false if it was rejected. A job is never dropped silently.
 */
interface JobQueue {
    boolean offer(String job);
    List<String> drain();
}

// Shared storage; subclasses decide only whether to accept.
abstract class ListJobQueue implements JobQueue {
    private final List<String> jobs = new ArrayList<>();
    protected abstract boolean hasRoom(int size);
    public final boolean offer(String job) {
        Objects.requireNonNull(job, "job");
        return hasRoom(jobs.size()) && jobs.add(job);
    }
    public final List<String> drain() {
        List<String> out = List.copyOf(jobs);
        jobs.clear();
        return out;
    }
}

final class UnboundedJobQueue extends ListJobQueue {
    protected boolean hasRoom(int size) { return true; }
}

final class BoundedJobQueue extends ListJobQueue {
    private final int capacity;
    BoundedJobQueue(int capacity) {
        if (capacity < 1) throw new IllegalArgumentException("capacity < 1");
        this.capacity = capacity;
    }
    protected boolean hasRoom(int size) { return size < capacity; }
}
