import java.io.IOException;

public class TranslateDemo {
    public static void main(String[] args) {
        ProfileService service = new ProfileService(new FlakyStore());
        try {
            service.load("u-7");
        } catch (ProfileUnavailableException e) {
            System.out.println(e.getMessage());
            System.out.println("cause: " + e.getCause().getMessage());
        }
    }
}

class ProfileUnavailableException extends RuntimeException {
    ProfileUnavailableException(String userId, Throwable cause) {
        super("profile " + userId + " unavailable", cause);
    }
}

class FlakyStore {
    String read(String key) throws IOException {  // checked: caller must decide
        throw new IOException("disk read failed for " + key);
    }
}

class ProfileService {
    private final FlakyStore store;

    ProfileService(FlakyStore store) { this.store = store; }

    String load(String userId) {
        try {
            return store.read("profiles/" + userId);
        } catch (IOException e) {                   // translate, keep the cause
            throw new ProfileUnavailableException(userId, e);
        }
    }
}
