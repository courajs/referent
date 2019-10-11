import Helper from '@ember/component/helper';

export default class SubscribeHelper extends Helper {
  _observer;
  _subscription;
  _value;

  compute([observer]) {
    if (observer !== this._observer) {
      if (this._subscription) {
        this._subscription.unsubscribe();
      }
      this._observer = observer;
      this._subscription = observer.subscribe((val) => {
        this._value = val;
        this.recompute();
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
