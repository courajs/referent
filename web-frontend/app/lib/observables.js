import {Subject} from 'rxjs';
import {tracked} from '@glimmer/tracking';

export function Poker() {
  let s = new Subject();
  return {
    stream: s,
    poke() {s.next();},
  };
}

// This is a subject. It expects to receive arrays,
// and concats them all together into a local array.
// To a new subscriber, it first emits the local array,
// then begins forwarding each new observed array.
export class CatchUpSubject {
  values = [];
  _inner = new Subject();

  next(update) {
    this.values.push(...update);
    this._inner.next(update);
  }

  subscribe(observer) {
    observer.next(this.values);
    return this._inner.subscribe(observer);
  }
}

// The point of this is to be a bridge from rx land to ember land.
// We can either render .value directly, or compute properties based on it,
// and it will re-render properly.
export class TrackedBehavior {
  @tracked value;
  initial;
  _resolve;

  constructor(obs) {
    this.initial = new Promise(r => this._resolve = r);
    obs.subscribe({
      next: (val) => {
        this.value = val;
        this._resolve(this);
      }
    });
  }
}
