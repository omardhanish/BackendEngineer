import java.util.Objects;
import java.util.TreeMap;

public class HexagonDemo {
    public static void main(String[] args) {
        // Composition root: the only place that knows every adapter.
        ShortenLink app = new LinkService(new InMemoryLinkStore(),
                                          new SequentialCodes());
        var cli = new CliAdapter(app);
        var http = new HttpAdapter(app);
        System.out.println(cli.handle("shorten https://example.com/docs"));
        System.out.println(http.post("{\"url\":\"https://example.com/faq\"}"));
        System.out.println(cli.handle("shorten ftp://example.com"));
        System.out.println(http.post("{\"url\":\"ftp://example.com\"}"));
    }
}

// ---- Inside the hexagon: plain Java, no I/O, no frameworks ----
interface ShortenLink { String shorten(String url); }       // driving port
interface LinkStore { void save(String code, String url); } // driven port
interface CodeGenerator { String next(); }                  // driven port

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

// ---- Outside: adapters translate between a technology and a port ----
final class CliAdapter {
    private final ShortenLink app;
    CliAdapter(ShortenLink app) { this.app = app; }
    String handle(String line) {
        try { return "short: " + app.shorten(line.substring(8)); }
        catch (InvalidUrlException e) { return "error: " + e.getMessage(); }
    }
}

final class HttpAdapter {
    private final ShortenLink app;
    HttpAdapter(ShortenLink app) { this.app = app; }
    String post(String json) {
        String url = json.split("\"")[3];          // toy JSON parsing
        try { return "201 {\"code\":\"" + app.shorten(url) + "\"}"; }
        catch (InvalidUrlException e) { return "400 {\"error\":\"bad url\"}"; }
    }
}

final class InMemoryLinkStore implements LinkStore {
    private final TreeMap<String, String> links = new TreeMap<>();
    public void save(String code, String url) { links.put(code, url); }
}

final class SequentialCodes implements CodeGenerator {
    private int n;
    public String next() { return "k" + (++n); }
}
