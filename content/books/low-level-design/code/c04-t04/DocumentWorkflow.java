import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;

public class DocumentWorkflow {
    public static void main(String[] args) {
        var doc = new Document("ada");
        doc.fire(Event.SUBMIT, "ada");
        doc.fire(Event.REJECT, "lin");
        doc.fire(Event.SUBMIT, "ada");
        attempt(doc, Event.APPROVE, "ada");       // guard is false
        doc.fire(Event.APPROVE, "lin");
        attempt(doc, Event.SUBMIT, "ada");        // no such transition
        doc.fire(Event.ARCHIVE, "lin");
        attempt(doc, Event.REJECT, "lin");        // final state
    }
    static void attempt(Document doc, Event event, String actor) {
        try {
            doc.fire(event, actor);
        } catch (IllegalStateException e) {
            System.out.println("Refused: " + e.getMessage());
        }
    }
}

enum State { DRAFT, IN_REVIEW, PUBLISHED, ARCHIVED }
enum Event { SUBMIT, REJECT, APPROVE, ARCHIVE }

final class Document {
    private static final Map<State, Map<Event, State>> RULES =
            new EnumMap<>(State.class);
    static {
        rule(State.DRAFT, Event.SUBMIT, State.IN_REVIEW);
        rule(State.DRAFT, Event.ARCHIVE, State.ARCHIVED);
        rule(State.IN_REVIEW, Event.REJECT, State.DRAFT);
        rule(State.IN_REVIEW, Event.APPROVE, State.PUBLISHED);
        rule(State.PUBLISHED, Event.ARCHIVE, State.ARCHIVED);
    }
    private static void rule(State from, Event on, State to) {
        RULES.computeIfAbsent(from, k -> new EnumMap<>(Event.class))
             .put(on, to);
    }
    private final String author;
    private State state = State.DRAFT;
    Document(String author) {
        this.author = Objects.requireNonNull(author, "author");
    }
    void fire(Event event, String actor) {
        Objects.requireNonNull(actor, "actor");
        State next = RULES.getOrDefault(state, Map.of()).get(event);
        if (next == null)
            throw new IllegalStateException(event + " not allowed in " + state);
        if (event == Event.APPROVE && actor.equals(author))  // [guard]
            throw new IllegalStateException("author cannot approve");
        state = next;
        System.out.println(event + " by " + actor + " -> " + state);
    }
}
