import * as fakeDate from 'jest-date-mock';
import pipe from 'transplexer';
import {
  toTransformer,
  merge,
  debounce,
  throttle,
  rebound,
  filter,
  map,
  reduce,
  get,
} from './index';

jest.useFakeTimers();

describe('toTransfromer', function () {

  test('convert a pure function into a decorator', function () {
    const c = jest.fn();
    const deco = toTransformer(x => x + 1);
    deco(c)(1);
    expect(c).toHaveBeenCalledWith(2);
  });

});

describe('merge', function () {

  test('will merge into object', function () {
    const p = pipe(merge);
    const f = jest.fn();
    p.connect(f);

    p.send({foo: 'bar'});

    expect(f).toHaveBeenCalledWith({foo: 'bar'});
  });

  test('will keep merging', function () {
    const p = pipe(merge);
    const f = jest.fn();
    p.connect(f);

    p.send({foo: 'bar'});
    p.send({bar: 'baz'});

    expect(f).toHaveBeenLastCalledWith({foo: 'bar', bar: 'baz'});
  });

});

describe('debounce', function () {

  test('wait until timeout to pass the value', function () {
    const p = pipe(debounce(200));
    const f = jest.fn();
    p.connect(f);
    p.send('test');

    expect(f).not.toHaveBeenCalled();
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 200);

    jest.runAllTimers();

    expect(f).toHaveBeenCalledWith('test');
  });

  test('only pass on the last value', function () {
    const p = pipe(debounce(200));
    const f = jest.fn();
    p.connect(f);

    p.send('first');
    p.send('second');
    p.send('third');

    jest.runAllTimers();

    expect(f).toHaveBeenCalledWith('third');
    expect(f).not.toHaveBeenCalledWith('first');
    expect(f).not.toHaveBeenCalledWith('second');
  });

});

describe('throttle', function () {

  test('pass values at specific intervals', function () {
    const p = pipe(throttle(100));
    const f = jest.fn();
    p.connect(f);

    fakeDate.advanceTo(0);
    p.send(1); // @ 0ms
    fakeDate.advanceBy(50);
    p.send(2); // @ 50ms
    fakeDate.advanceBy(50);
    p.send(3); // @ 100ms
    fakeDate.advanceBy(50);
    p.send(4); // @ 150ms

    expect(f).toHaveBeenCalledTimes(2);
    expect(f).toHaveBeenCalledWith(1);
    expect(f).toHaveBeenCalledWith(3);
  });

  test('pass values after the interval', function () {
    const p = pipe(throttle(100));
    const f = jest.fn();
    p.connect(f);

    fakeDate.advanceTo(0);
    p.send(1);
    fakeDate.advanceBy(100);
    p.send(2);

    expect(f).toHaveBeenCalledTimes(2);
    expect(f).toHaveBeenCalledWith(1);
    expect(f).toHaveBeenCalledWith(2);
  });

});

describe('rebound', function () {

  test('send default base value after timeout', function () {
    const p = pipe(rebound(100));
    const f = jest.fn();
    p.connect(f);

    p.send('test');

    expect(f).toHaveBeenCalledWith('test');
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);

    jest.runAllTimers();

    expect(f).toHaveBeenCalledTimes(2);
    expect(f).toHaveBeenCalledWith();
  });

  test('does not rebound if another value is received', function () {
    const p = pipe(rebound(100));
    const f = jest.fn();
    p.connect(f);

    p.send('test');
    jest.advanceTimersByTime(50);
    p.send('another');
    jest.advanceTimersByTime(50);

    expect(f).toHaveBeenCalledTimes(2);
    expect(f).toHaveBeenCalledWith('test');
    expect(f).toHaveBeenCalledWith('another');
    expect(f).not.toHaveBeenCalledWith();

    jest.clearAllTimers();
  });

  test('rebound twice in a row', function () {
    const p = pipe(rebound(100));
    const f = jest.fn();
    p.connect(f);

    p.send('test');
    jest.advanceTimersByTime(150);
    p.send('another');
    jest.advanceTimersByTime(150);

    expect(f).toHaveBeenCalledTimes(4);
  });

  test('rebound with custom base value', function () {
    const p = pipe(rebound(100, 'untest'));
    const f = jest.fn();
    p.connect(f);

    p.send('test');
    jest.runAllTimers();

    expect(f).toHaveBeenLastCalledWith('untest');
  });

  test('rebound with multiple values', function () {
    const p = pipe(rebound(100, 'untest', 'another'));
    const f = jest.fn();
    p.connect(f);

    p.send('test', 'again');
    jest.runAllTimers();

    expect(f).toHaveBeenLastCalledWith('untest', 'another');

  });

});

describe('filter', function () {
  function isTrue(x) {
    return !!x;
  }

  test('send value where predicate returns true', function () {
    const p = pipe(filter(isTrue));
    const f = jest.fn();
    p.connect(f);

    p.send('truthy');

    expect(f).toHaveBeenCalledWith('truthy');
  });

  test('do not send where predicate returns false', function () {
    const p = pipe(filter(isTrue));
    const f = jest.fn();
    p.connect(f);

    p.send('');

    expect(f).not.toHaveBeenCalled();
  });

  test('relay multiple values', function () {
    const p = pipe(filter(isTrue));
    const f = jest.fn();
    p.connect(f);

    p.send(true, 1, 2, 3);

    expect(f).toHaveBeenCalledWith(true, 1, 2, 3);
  });

});

describe('map', function () {

  test('apply a function to a value', function () {
    const p = pipe(map(function (x) {
      return x.toUpperCase();
    }));
    const f = jest.fn();
    p.connect(f);

    p.send('No shouting!');

    expect(f).toHaveBeenCalledWith('NO SHOUTING!');
  });

  test('apply a function to multiple arguments', function () {
    const p = pipe(map(function (...args) {
      return args.join(' ');
    }));
    const f = jest.fn();
    p.connect(f);

    p.send('No shouting,', 'please!');

    expect(f).toHaveBeenCalledWith('No shouting, please!');
  });

});

describe('reduce', function () {
  test('reduce a single value', function () {
    const p = pipe(reduce(function (current, x) {
      return current + x;
    }, 0));
    const f = jest.fn();
    p.connect(f);

    p.send(1);

    expect(f).toHaveBeenCalledWith(1);
  });

  test('reduce multiple values', function () {
    const p = pipe(reduce(function (current, x) {
      return current + x;
    }, 0));
    const f = jest.fn();
    p.connect(f);

    p.send(1);
    p.send(2);

    expect(f).toHaveBeenCalledWith(1);
    expect(f).toHaveBeenLastCalledWith(3);
  });

  test('reduce with multiple arguments', function () {
    const p = pipe(reduce(function (current, x, y, z) {
      return current + x + y + z;
    }, 0));
    const f = jest.fn();
    p.connect(f);

    p.send(1, 1, 1);
    p.send(1, 2, 3);

    expect(f).toHaveBeenCalledWith(3);
    expect(f).toHaveBeenLastCalledWith(9);
  });

});

describe('get', function () {

  test('get object key', function () {
    const p = pipe(get('test', 'default'));
    const f = jest.fn();
    p.connect(f);

    p.send({test: 'some value'});

    expect(f).toHaveBeenCalledWith('some value');
  });

  test('get default value if key does not exits', function () {
    const p = pipe(get('test', 'default'));
    const f = jest.fn();
    p.connect(f);

    p.send({foo: 'unrelated'});

    expect(f).toHaveBeenCalledWith('default');
  });

  test('get default value is value is not an object', function () {
    const p = pipe(get('test', 'default'));
    const f = jest.fn();
    p.connect(f);

    p.send(1);

    expect(f).toHaveBeenCalledWith('default');
  });

  test('get default value if value is undefined', function () {
    const p = pipe(get('test', 'default'));
    const f = jest.fn();
    p.connect(f);

    p.send(undefined);

    expect(f).toHaveBeenCalledWith('default');
  });

  test('get a path', function () {
    const p = pipe(get('test.me', 'default'));
    const f = jest.fn();
    p.connect(f);

    p.send({test: {me: 'now'}});

    expect(f).toHaveBeenCalledWith('now');
  });

  test('get the default value if key is missing', function () {
    const p = pipe(get('test.me', 'default'));
    const f = jest.fn();
    p.connect(f);

    p.send({test: {}});

    expect(f).toHaveBeenCalledWith('default');
  });

  test('get default if parent key is missing', function () {
    const p = pipe(get('test.me', 'default'));
    const f = jest.fn();
    p.connect(f);

    p.send({});

    expect(f).toHaveBeenCalledWith('default');
  });

  test('get default value if value is undefined', function () {
    const p = pipe(get('test.me', 'default'));
    const f = jest.fn();
    p.connect(f);

    p.send(undefined);

    expect(f).toHaveBeenCalledWith('default');
  });

  test('get a value from an array', function () {
    const p = pipe(get('test.0.me', 'default'));
    const f = jest.fn();
    p.connect(f);

    p.send({test: [{me: 'first'}, {me: 'second'}]});

    expect(f).toHaveBeenCalledWith('first');
  });

});
