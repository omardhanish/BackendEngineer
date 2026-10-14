import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public class AliasDemo {
    public static void main(String[] args) {
        var service = new ShortenerService(new InMemoryUrls());
        System.out.println(service.shortenAs("https://example.com/q3", "q3"));
        try {
            service.shortenAs("https://example.com/other", "q3");
        } catch (AliasTakenException e) {
            System.out.println("Rejected: " + e.getMessage());
        }
        System.out.println("q3 -> " + service.resolve("q3").orElse("none"));
    }
}

// Unchecked to keep the API light; callers that can retry catch it.
class AliasTakenException extends RuntimeException {
    AliasTakenException(String alias) { super("alias taken: " + alias); }
}

interface UrlRepository {
    // Saves only if the code is free; returns false if it was taken.
    boolean saveIfAbsent(String code, String url);
    Optional<String> find(String code);
}

final class InMemoryUrls implements UrlRepository {
    // putIfAbsent on ConcurrentHashMap checks and writes atomically.
    private final Map<String, String> byCode = new ConcurrentHashMap<>();
    public boolean saveIfAbsent(String code, String url) {
        return byCode.putIfAbsent(code, url) == null;
    }
    public Optional<String> find(String code) {
        return Optional.ofNullable(byCode.get(code));
    }
}

// The interviewer's follow-up: let users pick their own alias.
final class ShortenerService {
    private final UrlRepository urls;
    ShortenerService(UrlRepository urls) {
        this.urls = Objects.requireNonNull(urls, "urls");
    }
    String shortenAs(String url, String alias) {
        Objects.requireNonNull(url, "url");
        if (alias == null || !alias.matches("[a-z0-9-]{2,20}"))
            throw new IllegalArgumentException("bad alias: " + alias);
        if (!urls.saveIfAbsent(alias, url))
            throw new AliasTakenException(alias);
        return alias;
    }
    Optional<String> resolve(String code) { return urls.find(code); }
}
