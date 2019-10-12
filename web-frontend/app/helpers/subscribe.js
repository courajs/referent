import Helper from '@ember/component/helper';
import { next } from '@ember/runloop';

export default class SubscribeHelper extends Helper {
  _observer;
  _subscription;
  _value;

  compute([observer, name]) {
    if (observer !== this._observer) {
      this._value = null;
      if (this._subscription) {
        this._subscription.unsubscribe();
      }
      this._observer = observer;
      this._subscription = observer.subscribe((val) => {
        this._value = val;
        // HACK / MISUNDERSTANDING / UPGRADE
        // I don't think I should need to bump this to the next loop...
        // Maybe it's because of a backtracking problem? Maybe a helper
        // will only compute once per runloop?
        // Maybe this is a bug?
        // I'm on a canary release right now, once I get back to
        // stable I should see if this is still necessary, and then
        // find out if it's a bug, or if it's intended if it's documented
        // anywhere
        next(this, 'recompute');
      });
    }
    return this._value;
  }

  willDestroy() {
    this._subscription.unsubscribe();
    this._observer = null;
    this._subscription = null;
    this._value = null;
  }
}
