class Book {
  constructor(isbn, title) { this.isbn = isbn; this.title = title; }
}
class BookCopy {
  onLoan = false;
  constructor(id, book) { this.id = id; this.book = book; }
}
class Member {
  loans = [];
  constructor(id, limit = 2) { this.id = id; this.limit = limit; }
}
class Loan {
  constructor(copy, member, dueDay) {
    this.copy = copy; this.member = member; this.dueDay = dueDay;
  }
}
class Catalog {
  #copies = [];
  add(copy) { this.#copies.push(copy); }
  available(title) {
    return this.#copies.filter((c) => c.book.title === title && !c.onLoan);
  }
}
// FinePolicy: any object with feeFor(daysLate)
class FlatFine { feeFor(daysLate) { return Math.max(0, daysLate) * 10; } }

class LoanService {
  #fines;
  constructor(finePolicy) { this.#fines = finePolicy; } // injected FinePolicy
  borrow(member, copy, today) {
    if (copy.onLoan) throw new Error(`${copy.id} is already on loan`);
    if (member.loans.length >= member.limit) {
      throw new Error(`${member.id} reached the loan limit`);
    }
    const loan = new Loan(copy, member, today + 14);
    copy.onLoan = true;
    member.loans.push(loan);
    return loan;
  }
  giveBack(loan, today) {
    if (!loan.member.loans.includes(loan)) {
      throw new Error(`${loan.copy.id} was already returned`);
    }
    loan.copy.onLoan = false;
    loan.member.loans = loan.member.loans.filter((l) => l !== loan);
    return this.#fines.feeFor(today - loan.dueDay);
  }
}

const dune = new Book('isbn-001', 'Dune');
const catalog = new Catalog();
['c1', 'c2'].forEach((id) => catalog.add(new BookCopy(id, dune)));
const service = new LoanService(new FlatFine());
const ana = new Member('ana');

const [first] = catalog.available('Dune');
const loan = service.borrow(ana, first, 0);
console.log(first.id, 'due on day', loan.dueDay);
const free = catalog.available('Dune').map((c) => c.id);
console.log('still free:', free.join(', '));
try {
  service.borrow(new Member('raj'), first, 1);
} catch (err) { console.log(err.message); }
console.log('fine:', service.giveBack(loan, 17), 'loans:', ana.loans.length);
