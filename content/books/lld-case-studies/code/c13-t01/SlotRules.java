import java.time.*;

public class SlotRules {
  static final LocalTime OPEN = LocalTime.of(6, 0);
  static final LocalTime CLOSE = LocalTime.of(23, 0);
  static final int MAX_HOURS = 3;
  static final int BOOK_AHEAD_DAYS = 14;
  static final LocalDate TODAY = LocalDate.of(2026, 3, 2); // a Monday

  public static void main(String[] args) {
    check(LocalDateTime.of(2026, 3, 3, 7, 0), 2);
    check(LocalDateTime.of(2026, 3, 3, 18, 0), 2);
    check(LocalDateTime.of(2026, 3, 7, 9, 0), 1);
    check(LocalDateTime.of(2026, 3, 3, 18, 30), 1);
    check(LocalDateTime.of(2026, 3, 3, 9, 0), 4);
    check(LocalDateTime.of(2026, 3, 3, 22, 0), 2);
    check(LocalDateTime.of(2026, 3, 20, 9, 0), 1);
    check(LocalDateTime.of(2026, 3, 1, 9, 0), 1);
  }

  static void check(LocalDateTime start, int hours) {
    System.out.printf("%s for %dh -> %s%n", start, hours,
        verdict(start, hours));
  }

  static String verdict(LocalDateTime start, int hours) {
    if (start.getMinute() != 0) return "REJECT: start on the hour";
    if (hours < 1 || hours > MAX_HOURS) return "REJECT: 1 to 3 hours";
    LocalDate day = start.toLocalDate();
    if (day.isBefore(TODAY)) return "REJECT: date is in the past";
    if (day.isAfter(TODAY.plusDays(BOOK_AHEAD_DAYS)))
      return "REJECT: more than 14 days ahead";
    LocalDateTime end = start.plusHours(hours);
    if (start.toLocalTime().isBefore(OPEN)
        || end.isAfter(day.atTime(CLOSE)))
      return "REJECT: ground is open 06:00-23:00";
    return isPeak(start, hours) ? "OK, peak rate" : "OK, off-peak rate";
  }

  // Peak: weekends, or any hour that starts from 17:00 to 21:00.
  static boolean isPeak(LocalDateTime start, int hours) {
    DayOfWeek d = start.getDayOfWeek();
    if (d == DayOfWeek.SATURDAY || d == DayOfWeek.SUNDAY) return true;
    for (int i = 0; i < hours; i++) {
      int h = start.plusHours(i).getHour();
      if (h >= 17 && h < 22) return true;
    }
    return false;
  }
}
