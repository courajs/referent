import { helper } from '@ember/component/helper';

export function method([obj, methodName, ...args]/*, hash*/) {
  return obj[methodName](...args);
}

export default helper(method);
