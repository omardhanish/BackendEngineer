public class DocumentSwitch {
    public static void main(String[] args) {
        Document doc = new Document();
        doc.edit("v1");
        doc.submit();
        doc.approve();
        doc.edit("sneaky change"); // must be refused once published
        System.out.println(doc.status() + ": " + doc.text());
    }
}

enum Status { DRAFT, IN_REVIEW, PUBLISHED }

final class Document {
    private Status status = Status.DRAFT;
    private String text = "";

    void edit(String newText) {
        // Written before PUBLISHED existed; nobody came back to it
        if (status == Status.IN_REVIEW)
            throw new IllegalStateException("edit not allowed in review");
        text = newText;
    }
    void submit() {
        switch (status) {
            case DRAFT -> status = Status.IN_REVIEW;
            default -> throw new IllegalStateException("submit " + status);
        }
    }
    void approve() {
        switch (status) {
            case IN_REVIEW -> status = Status.PUBLISHED;
            default -> throw new IllegalStateException("approve " + status);
        }
    }
    Status status() { return status; }
    String text() { return text; }
}
