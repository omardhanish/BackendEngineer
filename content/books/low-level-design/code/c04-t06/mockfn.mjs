import { mock } from 'node:test';
import assert from 'node:assert/strict';

class PriceService {
  constructor(rates) { this.rates = rates; }
  inEuros(usd) { return Math.round(usd * this.rates.get('USD', 'EUR')); }
}
const get = mock.fn(() => 0.5);       // stub: canned answer, no network
const svc = new PriceService({ get });

assert.equal(svc.inEuros(40), 20);
console.log('calls:', get.mock.callCount());
console.log('args:', get.mock.calls[0].arguments);
