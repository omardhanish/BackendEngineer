import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public class ShortenerDemo {
    public static void main(String[] args) {
        var service = new ShortenerService(new CounterCodes(1000),
                new InMemoryUrls());
        String a = service.shorten("https://example.com/docs");
        String b = service.shorten("https://example.com/blog");
        System.out.println(a + " -> " + service.resolve(a).orElse("none"));
        System.out.println(b + " -> " + service.resolve(b).orElse("none"));
        System.out.println("zz -> " + service.resolve("zz").orElse("none"));
        try { service.shorten("ftp:/files"); }
        catch (IllegalArgumentException e) { System.out.println(e); }
    }
}

interface CodeGenerator { String next(); }    // where codes come from

interface UrlRepository {                     // where mappings live
    void save(String code, String url);
    Optional<String> find(String code);
}

// Base-36 counter: short, unique, predictable. Not thread-safe.
final class CounterCodes implements CodeGenerator {
    private long counter;
    CounterCodes(long start) { this.counter = start; }
    public String next() { return Long.toString(counter++, 36); }
}

final class InMemoryUrls implements UrlRepository {
    private final Map<String, String> byCode = new HashMap<>();
    public void save(String code, String url) { byCode.put(code, url); }
    public Optional<String> find(String code) {
        return Optional.ofNullable(byCode.get(code));
    }
}

// The use cases. It knows the contracts, not the implementations.
final class ShortenerService {
    private final CodeGenerator codes;
    private final UrlRepository urls;
    ShortenerService(CodeGenerator codes, UrlRepository urls) {
        this.codes = Objects.requireNonNull(codes, "codes");
        this.urls = Objects.requireNonNull(urls, "urls");
    }
    String shorten(String url) {
        Objects.requireNonNull(url, "url");
        if (!url.startsWith("https://") && !url.startsWith("http://"))
            throw new IllegalArgumentException("not a web URL: " + url);
        String code = codes.next();
        urls.save(code, url);
        return code;
    }
    Optional<String> resolve(String code) { return urls.find(code); }
}
