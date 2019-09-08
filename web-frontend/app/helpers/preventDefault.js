import { helper } from '@ember/component/helper';

export function preventDefault([f]) {
  return function(e) {
    e.preventDefault();
    if (f) {
      f();
    }
  }
}

export default helper(preventDefault);
