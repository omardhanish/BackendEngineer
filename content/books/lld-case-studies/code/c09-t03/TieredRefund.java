import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

public class TieredRefund {
  public static void main(String[] args) {
    LocalDate checkIn = LocalDate.of(2026, 3, 20);
    long paid = 1300000L;
    List<CancellationPolicy> plans = List.of(new FreeUntilDaysBefore(2),
        new Tiered(), new NonRefundable());
    for (CancellationPolicy p : plans)
      for (int daysBefore : new int[] {10, 3, 0})
        System.out.println(p.getClass().getSimpleName() + " " + daysBefore
            + "d before: " + p.refundMinor(paid, checkIn,
                checkIn.minusDays(daysBefore)));
  }
}

interface CancellationPolicy {
  long refundMinor(long paidMinor, LocalDate checkIn, LocalDate cancelOn);
}

class FreeUntilDaysBefore implements CancellationPolicy {
  private final int days;
  FreeUntilDaysBefore(int days) { this.days = days; }
  public long refundMinor(long paid, LocalDate in, LocalDate on) {
    return ChronoUnit.DAYS.between(on, in) >= days ? paid : 0;
  }
}

// New rate plans, new classes: ReservationService is not edited.
class Tiered implements CancellationPolicy {
  public long refundMinor(long paid, LocalDate in, LocalDate on) {
    long days = ChronoUnit.DAYS.between(on, in);
    if (days >= 7) return paid;
    if (days >= 2) return paid / 2;
    return 0;
  }
}

class NonRefundable implements CancellationPolicy {
  public long refundMinor(long paid, LocalDate in, LocalDate on) {
    return 0;
  }
}
