import java.util.*;

public class EditorUndoDemo {
    public static void main(String[] args) {
        Editor editor = new Editor();
        History history = new History(editor, 2);
        for (String line : List.of("a", "b", "c")) {
            history.checkpoint();
            editor.type(line);
        }
        System.out.println("now:  " + editor);
        while (history.undo()) System.out.println("undo: " + editor);
        System.out.println("nothing to undo, still " + editor);
    }
}

final class Editor {                          // the originator
    private final List<String> lines = new ArrayList<>();
    private int cursor;

    void type(String line) {
        lines.add(Objects.requireNonNull(line, "line"));
        cursor = lines.size();
    }
    Snapshot save() { return new Snapshot(lines, cursor); }
    void restore(Snapshot s) {
        lines.clear();
        lines.addAll(s.lines);
        cursor = s.cursor;
    }
    @Override public String toString() { return lines + " @" + cursor; }

    static final class Snapshot {             // the memento: opaque outside
        private final List<String> lines;
        private final int cursor;
        private Snapshot(List<String> lines, int cursor) {
            this.lines = List.copyOf(lines);  // a copy, never an alias
            this.cursor = cursor;
        }
    }
}

final class History {                         // the caretaker
    private final Deque<Editor.Snapshot> stack = new ArrayDeque<>();
    private final Editor editor;
    private final int capacity;

    History(Editor editor, int capacity) {
        if (capacity < 1) throw new IllegalArgumentException("capacity < 1");
        this.editor = Objects.requireNonNull(editor, "editor");
        this.capacity = capacity;
    }
    void checkpoint() {
        stack.push(editor.save());
        if (stack.size() > capacity) stack.removeLast(); // drop the oldest
    }
    boolean undo() {
        if (stack.isEmpty()) return false;
        editor.restore(stack.pop());
        return true;
    }
}
