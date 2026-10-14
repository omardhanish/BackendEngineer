import java.util.*;
public class StockCommandDemo {
    public static void main(String[] args) {
        Inventory inv = new Inventory();
        CommandHistory desk = new CommandHistory();
        List<Runnable> clicks = List.of(
            () -> desk.run(new AdjustStock(inv, "bolt", 10)),
            () -> desk.run(new AdjustStock(inv, "bolt", -4)),
            () -> desk.run(new AdjustStock(inv, "bolt", -50)),  // fails
            desk::undo, desk::redo, desk::undo,
            () -> desk.run(new AdjustStock(inv, "bolt", 1)));   // clears redo
        for (Runnable click : clicks) {
            click.run();
            System.out.println("    bolt = " + inv.qty("bolt"));
        }
        System.out.println("redo possible? " + desk.redo());
    }
}
final class Inventory {                                  // the receiver
    private final Map<String, Integer> stock = new TreeMap<>();
    int qty(String sku) { return stock.getOrDefault(sku, 0); }
    void change(String sku, int delta) {
        int next = qty(sku) + delta;
        if (next < 0) throw new IllegalStateException("only " + qty(sku));
        stock.put(sku, next);
    }
}
interface Command { void execute(); void undo(); String name(); }
record AdjustStock(Inventory inv, String sku, int delta) implements Command {
    AdjustStock {
        Objects.requireNonNull(inv, "inv"); Objects.requireNonNull(sku, "sku");
        if (delta == 0) throw new IllegalArgumentException("delta is 0");
    }
    public void execute() { inv.change(sku, delta); }
    public void undo() { inv.change(sku, -delta); }        // the inverse
    public String name() {
        return (delta > 0 ? "add " : "remove ") + Math.abs(delta) + " " + sku;
    }
}
final class CommandHistory {                             // the invoker
    private final Deque<Command> done = new ArrayDeque<>();
    private final Deque<Command> undone = new ArrayDeque<>();
    void run(Command c) {
        try { c.execute(); } catch (IllegalStateException e) {
            System.out.println("failed " + c.name() + ": " + e.getMessage());
            return;                                      // not recorded
        }
        done.push(c);
        undone.clear();                    // a new action ends the redo path
        System.out.println("did  " + c.name());
    }
    boolean undo() { return move(done, undone, true); }
    boolean redo() { return move(undone, done, false); }
    private boolean move(Deque<Command> from, Deque<Command> to, boolean back) {
        Command c = from.peek();              // pop only after success
        if (c == null) return false;                     // nothing to move
        if (back) c.undo(); else c.execute();
        from.pop(); to.push(c);
        System.out.println((back ? "undo " : "redo ") + c.name());
        return true;
    }
}
