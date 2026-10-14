import java.util.Objects;

public class DocumentStateDemo {
    public static void main(String[] args) {
        Document doc = new Document();
        doc.edit("v1");
        doc.submit();
        doc.reject("needs sources");
        doc.edit("v2 with sources");
        doc.submit();
        doc.approve();
        try {
            doc.edit("sneaky change");
        } catch (IllegalStateException e) {
            System.out.println("refused: " + e.getMessage());
        }
        System.out.println(doc.stateName() + ": " + doc.text());
    }
}

interface DocState {
    default String name() { return getClass().getSimpleName(); }
    default DocState edit(Document d, String t) { throw no("edit"); }
    default DocState submit(Document d) { throw no("submit"); }
    default DocState approve(Document d) { throw no("approve"); }
    default DocState reject(Document d, String why) { throw no("reject"); }
    private IllegalStateException no(String action) {
        return new IllegalStateException(action + " not allowed in " + name());
    }
}
final class Draft implements DocState {
    @Override public DocState edit(Document d, String t) {
        d.setText(t);
        return this;
    }
    @Override public DocState submit(Document d) {
        if (d.text().isBlank()) throw new IllegalStateException("empty doc");
        return new InReview();
    }
}
final class InReview implements DocState {
    @Override public DocState approve(Document d) { return new Published(); }
    @Override public DocState reject(Document d, String why) {
        System.out.println("reviewer: " + why);
        return new Draft();
    }
}
final class Published implements DocState {} // allows no actions at all

final class Document {
    private DocState state = new Draft();
    private String text = "";
    void edit(String t) { move(state.edit(this, Objects.requireNonNull(t))); }
    void submit() { move(state.submit(this)); }
    void approve() { move(state.approve(this)); }
    void reject(String why) { move(state.reject(this, why)); }
    private void move(DocState next) {
        if (next != state)
            System.out.println(state.name() + " -> " + next.name());
        state = next;
    }
    void setText(String t) { text = t; } // package-private: for states
    String text() { return text; }
    String stateName() { return state.name(); }
}
