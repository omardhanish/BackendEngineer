import java.util.ArrayList;
import java.util.List;

public class BuilderDemo {
    public static void main(String[] args) {
        Email mail = Email.to("ada@example.com")
            .subject("Invoice 42")
            .cc("ops@example.com")
            .build();
        System.out.println(mail);
        try {
            Email.to("bob@example.com").cc("ops@example.com").build();
        } catch (IllegalStateException e) {
            System.out.println("refused: " + e.getMessage());
        }
    }
}

final class Email {
    private final String to;
    private final String subject;
    private final List<String> cc;
    private Email(Builder b) {
        to = b.to; subject = b.subject; cc = List.copyOf(b.cc);
    }
    static Builder to(String to) { return new Builder(to); }

    @Override public String toString() {
        return "to=" + to + " cc=" + cc + " subject=" + subject;
    }

    static final class Builder {
        private final String to;
        private final List<String> cc = new ArrayList<>();
        private String subject;

        private Builder(String to) { this.to = to; }
        Builder subject(String s) { subject = s; return this; }
        Builder cc(String address) { cc.add(address); return this; }
        Email build() {
            if (subject == null) throw new IllegalStateException("no subject");
            return new Email(this);
        }
    }
}
