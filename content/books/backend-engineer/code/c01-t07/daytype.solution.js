function dayType(day) {
  switch (day) {
    case 'sat':
    case 'sun':
      return 'weekend';
    case 'mon':
    case 'tue':
    case 'wed':
    case 'thu':
    case 'fri':
      return 'weekday';
    default:
      return 'unknown';
  }
}
