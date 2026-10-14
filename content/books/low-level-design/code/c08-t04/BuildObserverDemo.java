import java.util.List;
import java.util.Objects;
import java.util.concurrent.CopyOnWriteArrayList;

public class BuildObserverDemo {
    public static void main(String[] args) {
        BuildServer server = new BuildServer();
        server.subscribe(e -> System.out.println("chat: " + e));
        server.subscribe(e -> {
            if (!e.passed()) throw new IllegalStateException("pager down");
        });
        server.subscribe(new FirstFailureAlert(server));
        server.subscribe(e -> System.out.println("dashboard: #" + e.build()));
        for (int b = 41; b <= 43; b++) server.finish(b, b == 41);
    }
}
record BuildEvent(int build, boolean passed) {
    @Override public String toString() {
        return "build " + build + (passed ? " passed" : " failed");
    }
}
interface BuildListener { void onBuild(BuildEvent event); }   // observer

final class BuildServer {                                      // subject
    private final List<BuildListener> listeners =
        new CopyOnWriteArrayList<>();          // safe to unsubscribe in a loop

    void subscribe(BuildListener l) {
        listeners.add(Objects.requireNonNull(l, "listener"));
    }
    void unsubscribe(BuildListener l) { listeners.remove(l); }

    void finish(int build, boolean passed) {
        BuildEvent event = new BuildEvent(build, passed);
        for (BuildListener l : listeners) {
            try {
                l.onBuild(event);
            } catch (RuntimeException ex) {    // one bad observer is isolated
                System.out.println("listener failed: " + ex.getMessage());
            }
        }
    }
}
final class FirstFailureAlert implements BuildListener {      // one-shot
    private final BuildServer server;
    FirstFailureAlert(BuildServer server) {
        this.server = Objects.requireNonNull(server);
    }
    @Override public void onBuild(BuildEvent e) {
        if (e.passed()) return;
        System.out.println("ALERT: first red build #" + e.build());
        server.unsubscribe(this);              // removes itself mid-loop
    }
}
