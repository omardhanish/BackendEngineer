public class TripWithFlags {
    public static void main(String[] args) {
        Trip t1 = new Trip("T-1");
        t1.setStatus("COMPLETED");   // driver app bug: start was skipped
        t1.chargeRider(1850);
        System.out.println(t1);
        t1.setStatus("CANCELED");    // typo, and cancel after charging
        System.out.println(t1);

        Trip t2 = new Trip("T-2");
        t2.setStatus("IN_PROGRESS");
        t2.setStatus("REQUESTED");   // a retried request moves it backwards
        System.out.println(t2);
    }
}

class Trip {
    private final String id;
    private String status = "REQUESTED";
    private long chargedCents;

    Trip(String id) { this.id = id; }

    // Any string, from any state, by any caller.
    void setStatus(String status) { this.status = status; }

    void chargeRider(long cents) {
        if (status.equals("COMPLETED")) chargedCents += cents;
    }

    @Override public String toString() {
        return id + " status=" + status + " charged=" + chargedCents;
    }
}
