import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class HexagonTestDemo {
    static int failed;

    public static void main(String[] args) {
        var store = new RecordingStore();
        ShortenLink core = new LinkService(store, () -> "abc"); // fake codes

        check("returns the generated code",
            core.shorten("https://example.com").equals("abc"));
        check("saves code and url through the port",
            store.saved.equals(List.of("abc=https://example.com")));
        try {
            core.shorten("http://example.com");
            check("rejects plain http", false);
        } catch (InvalidUrlException e) {
            check("rejects plain http", true);
        }
        check("saves nothing for a bad url", store.saved.size() == 1);
        System.out.println(failed == 0 ? "all passed" : failed + " failed");
    }

    static void check(String name, boolean ok) {
        if (!ok) failed++;
        System.out.println((ok ? "PASS " : "FAIL ") + name);
    }
}

// A copy of the core (one file per example); real tests import it.
interface ShortenLink { String shorten(String url); }
interface LinkStore { void save(String code, String url); }
interface CodeGenerator { String next(); }

final class InvalidUrlException extends RuntimeException {
    InvalidUrlException(String url) { super("not an https url: " + url); }
}

final class LinkService implements ShortenLink {
    private final LinkStore store;
    private final CodeGenerator codes;
    LinkService(LinkStore store, CodeGenerator codes) {
        this.store = Objects.requireNonNull(store, "store");
        this.codes = Objects.requireNonNull(codes, "codes");
    }
    public String shorten(String url) {
        Objects.requireNonNull(url, "url");
        if (!url.startsWith("https://")) throw new InvalidUrlException(url);
        String code = codes.next();
        store.save(code, url);
        return code;
    }
}

// A test adapter for the driven port: records calls, no database.
final class RecordingStore implements LinkStore {
    final List<String> saved = new ArrayList<>();
    public void save(String code, String url) { saved.add(code + "=" + url); }
}
