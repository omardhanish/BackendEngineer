import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class Requirements {
    public static void main(String[] args) {
        for (UseCase uc : UseCase.values()) {
            String tag = uc.inV1 ? "IN " : "OUT";
            System.out.println(tag + " " + uc.actor + ": " + uc.name());
        }
        List<Request> due = new ArrayList<>(List.of(
            new Request("send-report", 1000, 1),
            new Request("charge-card", 1000, 5),
            new Request("clean-temp", 500, 0)));
        due.sort(Request.RUN_ORDER);
        List<String> names = new ArrayList<>();
        for (Request r : due) {
            names.add(r.name());
        }
        System.out.println("run order: " + names);
    }
}

// Earliest time first; on a tie, the higher priority number goes first.
record Request(String name, long runAtMillis, int priority) {
    static final Comparator<Request> RUN_ORDER = Comparator
        .comparingLong(Request::runAtMillis)
        .thenComparing(Request::priority, Comparator.reverseOrder());
}

enum UseCase {
    SUBMIT_ONE_SHOT_TASK("Client", true),
    SUBMIT_RECURRING_TASK("Client", true),
    CANCEL_TASK("Client", true),
    READ_TASK_STATUS("Client", true),
    RUN_DUE_TASKS_IN_ORDER("Clock", true),
    RETRY_WITH_BACKOFF("Scheduler", true),
    SURVIVE_PROCESS_RESTART("Operator", false),
    TASK_DEPENDENCIES_DAG("Client", false),
    CRON_EXPRESSIONS("Client", false);

    final String actor;
    final boolean inV1;
    UseCase(String actor, boolean inV1) {
        this.actor = actor;
        this.inV1 = inV1;
    }
}
