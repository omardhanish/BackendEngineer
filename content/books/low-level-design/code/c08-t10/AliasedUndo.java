import java.util.ArrayList;
import java.util.List;

public class AliasedUndo {
    public static void main(String[] args) {
        Editor editor = new Editor();
        editor.type("Dear team,");

        // The caller saves state by reaching into the editor.
        List<String> savedLines = editor.getLines();
        int savedCursor = editor.getCursor();

        editor.type("Oops, wrong draft");
        System.out.println("before undo: " + editor.getLines());

        // "Undo": put the saved values back.
        editor.setLines(savedLines);
        editor.setCursor(savedCursor);
        System.out.println("after undo:  " + editor.getLines());
        System.out.println("cursor: " + editor.getCursor());
    }
}

final class Editor {
    private List<String> lines = new ArrayList<>();
    private int cursor;

    void type(String line) { lines.add(line); cursor = lines.size(); }

    // Getters and setters exist only so outsiders can save and restore.
    List<String> getLines() { return lines; }   // same list, not a copy
    int getCursor() { return cursor; }
    void setLines(List<String> lines) { this.lines = lines; }
    void setCursor(int cursor) { this.cursor = cursor; }
}
