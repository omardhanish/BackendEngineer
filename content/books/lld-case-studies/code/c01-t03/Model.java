import java.time.Instant;

public class Model {
  public static void main(String[] args) {
    Instant nine = Instant.parse("2026-03-02T09:00:00Z");
    Instant half = Instant.parse("2026-03-02T09:30:00Z");
    System.out.println(new Slot("SL-1", "D-1", nine, half, 50000));
    try {
      new Slot("SL-2", "D-1", half, nine, 50000);
    } catch (IllegalArgumentException e) {
      System.out.println("refused: " + e.getMessage());
    }
    try {
      new Slot("SL-3", "D-1", nine, half, -1);
    } catch (IllegalArgumentException e) {
      System.out.println("refused: " + e.getMessage());
    }
  }
}

enum AppointmentStatus { BOOKED, CANCELLED, COMPLETED }

record Doctor(String id, String name) {}

record Slot(String id, String doctorId, Instant startsAt, Instant endsAt,
    long feeMinor) {
  Slot {
    if (!endsAt.isAfter(startsAt)) {
      throw new IllegalArgumentException("endsAt must be after startsAt");
    }
    if (feeMinor < 0) throw new IllegalArgumentException("feeMinor < 0");
  }
}

record Appointment(String id, String slotId, String patientId,
    AppointmentStatus status, int version) {}
