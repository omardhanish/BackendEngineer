import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

public class SnapshotSubscribers {
  public static void main(String[] args) throws Exception {
    System.out.println("ArrayList: " + deliver(new ArrayList<>()));
    System.out.println("CopyOnWrite: " + deliver(new CopyOnWriteArrayList<>()));

    List<Consumer<String>> subs = new CopyOnWriteArrayList<>();
    List<Thread> threads = new ArrayList<>();
    for (int t = 0; t < 4; t++) {
      Thread th = new Thread(() -> {
        for (int i = 0; i < 500; i++) subs.add(e -> { });
      });
      threads.add(th);
      th.start();
    }
    for (Thread th : threads) th.join();
    System.out.println("subscribed from 4 threads: " + subs.size());
  }

  // The second handler subscribes a new one while EV-1 is delivered.
  static String deliver(List<Consumer<String>> subs) {
    List<String> got = new ArrayList<>();
    subs.add(e -> got.add("audit"));
    subs.add(e -> { got.add("welcome"); subs.add(x -> got.add("late")); });
    subs.add(e -> got.add("email"));
    try {
      for (Consumer<String> s : subs) s.accept("EV-1");
    } catch (ConcurrentModificationException ex) {
      return got + " then " + ex.getClass().getSimpleName();
    }
    return got.toString();
  }
}
