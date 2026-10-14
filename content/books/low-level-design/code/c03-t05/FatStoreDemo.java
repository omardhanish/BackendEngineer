import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class FatStoreDemo {
    public static void main(String[] args) {
        var bucket = new BucketStore();
        bucket.write("2019-report", "old numbers");
        var job = new RetentionJob();
        for (DocumentStore store : List.of(bucket, new LegalArchive())) {
            String name = store.getClass().getSimpleName();
            try {
                job.purge(store, "2019-report");
                System.out.println(name + ": purged");
            } catch (UnsupportedOperationException e) {
                System.out.println(name + ": crashed, " + e.getMessage());
            }
        }
    }
}

// One wide contract that every store must implement in full.
interface DocumentStore {
    String read(String key);
    void write(String key, String body);
    void delete(String key);
}

final class BucketStore implements DocumentStore {
    private final Map<String, String> docs = new TreeMap<>();
    public String read(String key) { return docs.get(key); }
    public void write(String key, String body) { docs.put(key, body); }
    public void delete(String key) { docs.remove(key); }
}

// Legally frozen: it can only be read, yet must "implement" writes.
final class LegalArchive implements DocumentStore {
    public String read(String key) { return "archived " + key; }
    public void write(String key, String body) {
        throw new UnsupportedOperationException("archive is read-only");
    }
    public void delete(String key) {
        throw new UnsupportedOperationException("archive is read-only");
    }
}

// Needs only delete(), but the type accepts any DocumentStore.
final class RetentionJob {
    void purge(DocumentStore store, String key) {
        store.delete(key);
    }
}
