import pipe from 'transplexer';

export const toTransformer = map;

export function merge(next) {
  let obj = {};

  return function (another) {
    Object.assign(obj, another);
    next(obj);
  };
};

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
        let elapsed = Date.now() - lastCallTimestamp;
        if (elapsed >= interval) {
          call(...args);
        }
      }
    };
  };
};

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

export function filter(testFn) {
  return function (next) {
    return function (...args) {
      if (testFn(...args)) {
        next(...args);
      }
    };
  };
};

export function map(fn) {
  return function (next) {
    return function (...args) {
      next(fn(...args));
    };
  };
};

export function reduce(fn, initialValue) {
  return function (next) {
    let state = initialValue;

    return function (...args) {
      state = fn(state, ...args);
      next(state);
    };
  };
};

export function get(path, defaultValue) {
  let segments = path.split('.');

  return function (next) {
    if (segments.length === 1) {
      return function (obj) {
        if (typeof obj === 'undefined') {
          return next(defaultValue);
        }

        let value = obj[path];

        if (typeof value === 'undefined') {
          next(defaultValue);
        }
        else {
          next(value);
        }
      };
    }

    return function (obj) {
      next(function getValue(remaining, val) {
        if (typeof val === 'undefined') {
          return defaultValue;
        }

        if (remaining.length === 0) {
          return val;
        }

        let [head, ...tail] = remaining;

        if (head in val) {
          return getValue(tail, val[head]);
        }

        return defaultValue;
      }(segments, obj));
    };
  };
};

export function splitter(keys, ignoreMissingKeys = false) {
  let keyPipes = {}

  keys.forEach(function (key) {
    if (key === 'send') {
      return;
    }
    keyPipes[key] = pipe();
  });

  return {
    ...keyPipes,
    send: function (obj) {
      keys.forEach(function (key) {
        if (ignoreMissingKeys && !obj.hasOwnProperty(key)) {
          return;
        }
        keyPipes[key].send(obj[key]);
      });
    },
  };
};

export function always(...values) {
  return function (next) {
    return function () {
      next(...values);
    };
  };
};

export function sticky(initialValue) {
  return function (next) {
    return function (value, ...args) {
      if (value !== initialValue) {
        initialValue = value;
        next(value, ...args);
      }
    };
  };
};

export function junction(initialState, ...transformers) {
  let state = initialState || {};
  let p = pipe(...transformers);

  return {
    sendAs: function (key) {
      return function (val) {
        state[key] = val;
        p.send(state);
      };
    },
    connect: function (fn) {
      return p.connect(fn);
    },
  };
};

export function aside(fn) {
  return function (next) {
    return function(...args) {
      fn(...args);
      next(...args);
    };
  };
};
