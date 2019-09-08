import {isFieldDescriptor} from 'nomicon/lib/decorators';

// TODO: this doesn't really respect promises / async functions.
// The first call will return the promise returned by the wrap function.
// But the second call will immediately resolve. Instead it should coalesce
// later calls together into resolving once the enqueued function runs and resolves.

export function keepLatest(target,key,desc) {
  return {
    configurable: true,
    get() {
      let running = false;
      let again = false;
      let that = this;

      async function f() {
        if (running) {
          again = true;
          return;
        }
        running = true;
        await desc.value.apply(that, arguments);
        running = false;
        if (again) {
          again = false;
          f();
        }
      }

      Object.defineProperty(this, key, {
        configurable: true,
        writable: true,
        value: f,
      });

      return f;
    }
  };
}

export function drop(target,key,desc) {
  return {
    configurable: true,
    get() {
      let running = false;

      async function f() {
        if (running) { return; }
        running = true;
        await desc.value.apply(this, arguments);
        running = false;
      }

      Object.defineProperty(this, key, {
        configurable: true,
        writable: true,
        value: f,
      });

      return f;
    }
  };
}
