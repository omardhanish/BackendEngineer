public class UseCases {
  public static void main(String[] args) {
    System.out.println("In scope:");
    for (UseCase u : UseCase.values()) {
      if (u.inScope()) {
        System.out.printf("  %-7s %-13s %-31s %s%n",
            u.actor, u, u.endpoint, u.table);
      }
    }
    System.out.println("Out of scope:");
    for (UseCase u : UseCase.values()) {
      if (!u.inScope()) System.out.println("  " + u);
    }
    long doctors = 500, slotsPerDay = 16, daysAhead = 30;
    System.out.println("Assumed slot rows: "
        + doctors * slotsPerDay * daysAhead);
  }
}

enum Actor { PATIENT, DOCTOR }

enum UseCase {
  PUBLISH_SLOTS(Actor.DOCTOR, "POST /doctors/{id}/slots", "slot"),
  SEARCH_SLOTS(Actor.PATIENT, "GET /doctors/{id}/slots", "slot"),
  BOOK_SLOT(Actor.PATIENT, "POST /appointments", "appointment"),
  CANCEL(Actor.PATIENT, "POST /appointments/{id}/cancel", "appointment"),
  PAY_ONLINE(Actor.PATIENT, null, null),
  VIDEO_CALL(Actor.DOCTOR, null, null);

  final Actor actor;
  final String endpoint, table;
  UseCase(Actor a, String e, String t) { actor = a; endpoint = e; table = t; }
  boolean inScope() { return endpoint != null; }
}
