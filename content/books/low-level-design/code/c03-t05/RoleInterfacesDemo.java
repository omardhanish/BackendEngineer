import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.TreeMap;

public class RoleInterfacesDemo {
    public static void main(String[] args) {
        var bucket = new BucketStore();
        bucket.write("2019-report", "old numbers");
        var viewer = new ReportViewer(new LegalArchive());
        System.out.println(viewer.show("2019-report"));
        var job = new RetentionJob(bucket);
        job.purge("2019-report");
        System.out.println(new ReportViewer(bucket).show("2019-report"));
        // new RetentionJob(new LegalArchive()); <- does not compile
    }
}

// Each interface is one role that some client actually needs.
interface DocumentReader { Optional<String> read(String key); }
interface DocumentWriter {
    void write(String key, String body);
    void delete(String key);
}

final class BucketStore implements DocumentReader, DocumentWriter {
    private final Map<String, String> docs = new TreeMap<>();
    public Optional<String> read(String key) {
        return Optional.ofNullable(docs.get(key));
    }
    public void write(String key, String body) {
        docs.put(Objects.requireNonNull(key), Objects.requireNonNull(body));
    }
    public void delete(String key) { docs.remove(key); }
}

// Promises only what it can keep: no stub methods, no throws.
final class LegalArchive implements DocumentReader {
    public Optional<String> read(String key) {
        return Optional.of("archived " + key);
    }
}

final class ReportViewer {
    private final DocumentReader reader;
    ReportViewer(DocumentReader reader) {
        this.reader = Objects.requireNonNull(reader, "reader");
    }
    String show(String key) {
        return key + " -> " + reader.read(key).orElse("(missing)");
    }
}

final class RetentionJob {
    private final DocumentWriter writer;
    RetentionJob(DocumentWriter writer) {
        this.writer = Objects.requireNonNull(writer, "writer");
    }
    void purge(String key) { writer.delete(key); }
}
