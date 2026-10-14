import java.util.*;

public class Layers {
  public static void main(String[] args) {
    var repo = new InMemoryAppointmentRepository();
    var service = new AppointmentService(repo);
    var controller = new AppointmentController(service);
    System.out.println(controller.post("SL-1", "P-1"));
    System.out.println(controller.post("SL-1", "P-2"));
    System.out.println(controller.post(" ", "P-3"));
  }
}

// API layer: check input shape, call one service method, map to HTTP.
class AppointmentController {
  private final AppointmentService service;
  AppointmentController(AppointmentService s) { service = s; }

  String post(String slotId, String patientId) {
    if (slotId.isBlank()) return "400 {error: VALIDATION}";
    try {
      Appointment a = service.book(slotId, patientId);
      return "201 {id: " + a.id() + ", status: " + a.status() + "}";
    } catch (SlotTakenException e) {
      return "409 {error: SLOT_TAKEN}";
    }
  }
}

// Service layer: one use case. No HTTP types, no SQL.
class AppointmentService {
  private final AppointmentRepository repo;
  private int nextId = 1;
  AppointmentService(AppointmentRepository r) { repo = r; }

  Appointment book(String slotId, String patientId) {
    if (repo.findLiveBySlot(slotId).isPresent()) {
      throw new SlotTakenException();
    }
    Appointment a = Appointment.book("AP-" + nextId++, slotId, patientId);
    repo.save(a);
    return a;
  }
}

// Domain layer: data and its own rules. Knows nothing about storage.
record Appointment(String id, String slotId, String patientId,
    String status) {
  Appointment {
    Objects.requireNonNull(slotId, "slotId");
    Objects.requireNonNull(patientId, "patientId");
  }
  static Appointment book(String id, String slotId, String patientId) {
    return new Appointment(id, slotId, patientId, "BOOKED");
  }
}

class SlotTakenException extends RuntimeException {}

// Repository: the service owns this interface; storage is a detail.
interface AppointmentRepository {
  Optional<Appointment> findLiveBySlot(String slotId);
  void save(Appointment a);
}

class InMemoryAppointmentRepository implements AppointmentRepository {
  private final Map<String, Appointment> rows = new LinkedHashMap<>();
  public Optional<Appointment> findLiveBySlot(String slotId) {
    return rows.values().stream()
        .filter(a -> a.slotId().equals(slotId))
        .filter(a -> a.status().equals("BOOKED")).findFirst();
  }
  public void save(Appointment a) { rows.put(a.id(), a); }
}
