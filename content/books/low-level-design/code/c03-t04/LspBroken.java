import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class LspBroken {
    public static void main(String[] args) {
        runAll(new JobQueue());
        runAll(new BoundedJobQueue(2));
    }

    // Written and tested against JobQueue: "add() always keeps the job".
    static void runAll(JobQueue queue) {
        for (String job : List.of("email", "invoice", "backup")) {
            queue.add(job);
        }
        System.out.println(queue.getClass().getSimpleName()
                + " ran " + queue.drain() + " (submitted 3)");
    }
}

class JobQueue {
    protected final List<String> jobs = new ArrayList<>();

    /** Contract: the job is kept and runs on the next drain(). */
    void add(String job) {
        jobs.add(Objects.requireNonNull(job, "job"));
    }

    List<String> drain() {
        List<String> out = List.copyOf(jobs);
        jobs.clear();
        return out;
    }
}

// Compiles and passes its own tests, but breaks the promise of add().
class BoundedJobQueue extends JobQueue {
    private final int capacity;

    BoundedJobQueue(int capacity) {
        this.capacity = capacity;
    }

    @Override
    void add(String job) {
        if (jobs.size() < capacity) super.add(job);   // else: dropped
    }
}
