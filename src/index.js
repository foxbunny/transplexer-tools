/**
 * Convert a function into a pipe transformer.
 *
 * This is a helper function that converts a normal function into a pipe
 * transformer. The function should take a value and return a value. The next
 * transformer is then invoked with the return value of the supplied function.
 *
 * Please note that this is not the only way to write transformers, and comes
 * with a limitation of not being able to avoid calling the next transformer.
 * If you want to write a transformers that sometimes wants to break the
 * transformer chain (e.g., debouncing/throttling), then you should write one
 * from scratch.
 */
export function toTransformer(f) {
  return function (next) {
    return function (val) {
      next(f(val));
    };
  };
};

/**
 * Transformer that maintains an object to which all values are merged
 *
 * The object this transformer maintains internally is mutable. Whenver a value
 * reaches this transformer, it will merge all own properties of the value into
 * the object, and transmit the object to the next transformer.
 */
export function merge(next) {
  const obj = {};

  return function (another) {
    Object.assign(obj, another);
    next(obj);
  };
};

/**
 * Transformer that debounces the flow of values
 *
 * When a value reaches this transformer, it delays transmission for a
 * specified period of time. The timer is reset every time a new value is
 * received. When the timer is allowed to run out, the last value received is
 * trasmitted. All values received before the last one will be discarded.
 */
export function debounce(time) {
  return function (next) {
    let timer;

    return function (...args) {
      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(function () {
        next(...args);
      }, time);
    }
  };
};

/**
 * Transformers that limits the flow of values to a specified interval
 *
 * As values are received, they are allowed to go through only if the previous
 * value was received with a gap of at least the specified interval. If the gap
 * is less than the interval, then the value is discarded.
 */
export function throttle(interval) {
  return function (next) {
    let lastCallTimestamp;

    function call(...args) {
      lastCallTimestamp = Date.now();
      next(...args);
    }

    return function (...args) {
      if (lastCallTimestamp == null) {
        call(...args);
      }
      else {
        const elapsed = Date.now() - lastCallTimestamp;
        if (elapsed >= interval) {
          call(...args);
        }
      }
    };
  };
};

/**
 * Transformer that sends base values with a delay on every value received
 *
 * The time is specified in milliseconds. The base values defaults to no
 * values (connected callbacks or a transformer following this one are invoked
 * without arguments), and any number of values can be specified.
 */
export function rebound(time, ...baseValues) {
  return function (next) {
    let timer;

    return function (...args) {
      if (timer) {
        clearTimeout(timer);
      }
      next(...args);
      timer = setTimeout(function () {
        next(...baseValues);
      }, time);
    };
  };
};

/**
 * Transformer that filters values for which the test function returns truthy
 *
 * The return value of the `testFn` is only used for testing the values. When
 * this function returns a truthy vaule, the original value is passed on.
 *
 * The test function will receive all arguments that `send()` receives (that
 * is, whatever the previous transformer decides to relay).
 */
export function filter(testFn) {
  return function (next) {
    return function (...args) {
      if (testFn(...args)) {
        next(...args);
      }
    };
  };
};

/**
 * Transformer that applies a function to all values and passes on return value
 *
 * The function has to return a value, and the next transformer is invoked with
 * that value.
 */
export function map(fn) {
  return function (next) {
    return function (...args) {
      next(fn(...args));
    };
  };
};

/**
 * Transformer that continually reduces incoming values into a single value
 *
 * The function `fn` takes the current state (or `initialValue` the first time)
 * and any number of arguments coming from the previous transformer or
 * `send()`, and must return the new state. The returned state is passed on to
 * the next transformer or connected callbacks.
 */
export function reduce(fn, initialValue) {
  return function (next) {
    let state = initialValue;

    return function (...args) {
      state = fn(state, ...args);
      next(state);
    };
  };
};
