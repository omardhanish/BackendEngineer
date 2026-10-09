# Meeting Room Booking System

## Scope
In: search free rooms, book, cancel, no double booking, notify.
Out: recurring bookings (stretch goal), payments, calendars.
Diagrams: class-diagram.txt, sequence-book.txt (one book() call).

## Key decisions
- ConflictPolicy is a Strategy: overlap rules differ per building.
  Rejected: an if-chain per building inside BookingService.
- BookingListener is an Observer: notify and audit stay out of book().
  Rejected: BookingService calling NotificationService directly.
- Times are hours as double (9.5 = 09:30) to keep the model small.
  Rejected: LocalTime, which adds parsing to every example.
