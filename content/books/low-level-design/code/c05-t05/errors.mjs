class BookingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}
class RoomTakenError extends BookingError {
  constructor(roomId) { super('ROOM_TAKEN', `room ${roomId} is taken`); }
}
class NotOwnerError extends BookingError {
  constructor() { super('NOT_OWNER', 'only the organiser can cancel'); }
}

// The edge maps domain errors; BookingService never knows about HTTP.
const STATUS = { ROOM_TAKEN: 409, NOT_OWNER: 403 };
function toResponse(err) {
  if (err instanceof BookingError) {
    return { status: STATUS[err.code] ?? 500, code: err.code };
  }
  return { status: 500, code: 'INTERNAL' }; // log it, never leak details
}

console.log(toResponse(new RoomTakenError('r2')));
console.log(toResponse(new NotOwnerError()));
console.log(toResponse(new TypeError('cannot read properties')));
console.log(new RoomTakenError('r2').name, new RoomTakenError('r2').message);
