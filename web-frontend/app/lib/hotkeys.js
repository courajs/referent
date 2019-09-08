import {computed} from '@ember/object';

export function bound(handlers) {
  return computed(function() {
    let result = {};
    for (let key in handlers) {
      result[key] = handlers[key].bind(this);
    }
    return result;
  });
}
