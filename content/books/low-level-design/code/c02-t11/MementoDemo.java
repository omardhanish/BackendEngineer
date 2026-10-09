import java.util.ArrayDeque;
import java.util.Deque;

public class MementoDemo {
    public static void main(String[] args) {
        Editor editor = new Editor();
        Deque<Editor.Snapshot> undo = new ArrayDeque<>(); // the caretaker
        editor.type("Dear Bob");
        undo.push(editor.save());
        editor.type(", thanks");
        undo.push(editor.save());
        editor.type(" a lot");
        System.out.println(editor.text());
        editor.restore(undo.pop());
        System.out.println(editor.text());
        editor.restore(undo.pop());
        System.out.println(editor.text());
    }
}

class Editor {
    // The memento: an immutable copy of the editor's private state.
    record Snapshot(String text, int cursor) {}

    private String text = "";
    private int cursor = 0;

    void type(String s) {
        text = text.substring(0, cursor) + s + text.substring(cursor);
        cursor += s.length();
    }

    Snapshot save() { return new Snapshot(text, cursor); }

    void restore(Snapshot s) {
        text = s.text();
        cursor = s.cursor();
    }

    String text() { return text; }
}
