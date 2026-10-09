import java.util.Iterator;
import java.util.List;
import java.util.NoSuchElementException;

public class IteratorDemo {
    public static void main(String[] args) {
        Inbox inbox = new Inbox(List.of(
            List.of("hi", "invoice"), List.of(), List.of("reminder")));
        for (String mail : inbox) {
            System.out.println(mail);
        }
    }
}

// Stored as pages; callers see one flat sequence.
class Inbox implements Iterable<String> {
    private final List<List<String>> pages;

    Inbox(List<List<String>> pages) { this.pages = pages; }

    public Iterator<String> iterator() {
        return new Iterator<>() {
            private int page = 0;
            private int pos = 0;

            public boolean hasNext() {
                while (page < pages.size() && pos >= pages.get(page).size()) {
                    page++;
                    pos = 0;
                }
                return page < pages.size();
            }

            public String next() {
                if (!hasNext()) throw new NoSuchElementException();
                return pages.get(page).get(pos++);
            }
        };
    }
}
