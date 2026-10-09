import java.util.ArrayDeque;
import java.util.Deque;

public class CommandDemo {
    public static void main(String[] args) {
        Document doc = new Document();
        History history = new History();
        history.run(new Append(doc, "Hello"));
        history.run(new Append(doc, " world"));
        System.out.println(doc.text());
        history.undo();
        System.out.println(doc.text());
        history.redo();
        System.out.println(doc.text());
    }
}

interface Command { void execute(); void undo(); }

class Document {
    private final StringBuilder body = new StringBuilder();
    void insert(String s) { body.append(s); }
    void cut(int n) { body.setLength(body.length() - n); }
    String text() { return "[" + body + "]"; }
}

record Append(Document doc, String s) implements Command {
    public void execute() { doc.insert(s); }
    public void undo() { doc.cut(s.length()); }
}

class History {
    private final Deque<Command> undos = new ArrayDeque<>();
    private final Deque<Command> redos = new ArrayDeque<>();
    void run(Command c) { c.execute(); undos.push(c); redos.clear(); }

    void undo() {
        if (undos.isEmpty()) return;
        Command c = undos.pop(); c.undo(); redos.push(c);
    }
    void redo() {
        if (redos.isEmpty()) return;
        Command c = redos.pop(); c.execute(); undos.push(c);
    }
}
