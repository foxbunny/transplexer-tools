import * as fakeDate from 'jest-date-mock';
import pipe from 'transplexer';
import {
  merge,
  debounce,
  throttle,
  rebound,
  filter,
  map,
  reduce,
  get,
  splitter,
  always,
  sticky,
  junction,
} from './index';

jest.useFakeTimers();

describe('merge', function () {

  test('will merge into object', function () {
    let p = pipe(merge);
    let f = jest.fn();
    p.connect(f);

    p.send({foo: 'bar'});

    expect(f).toHaveBeenCalledWith({foo: 'bar'});
  });

  test('will keep merging', function () {
    let p = pipe(merge);
    let f = jest.fn();
    p.connect(f);

    p.send({foo: 'bar'});
    p.send({bar: 'baz'});

    expect(f).toHaveBeenLastCalledWith({foo: 'bar', bar: 'baz'});
  });

});

describe('debounce', function () {

  test('wait until timeout to pass the value', function () {
    let p = pipe(debounce(200));
    let f = jest.fn();
    p.connect(f);
    p.send('test');

    expect(f).not.toHaveBeenCalled();
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 200);

    jest.runAllTimers();

    expect(f).toHaveBeenCalledWith('test');
  });

  test('only pass on the last value', function () {
    let p = pipe(debounce(200));
    let f = jest.fn();
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
    let p = pipe(throttle(100));
    let f = jest.fn();
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
    let p = pipe(throttle(100));
    let f = jest.fn();
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
    let p = pipe(rebound(100));
    let f = jest.fn();
    p.connect(f);

    p.send('test');

    expect(f).toHaveBeenCalledWith('test');
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);

    jest.runAllTimers();

    expect(f).toHaveBeenCalledTimes(2);
    expect(f).toHaveBeenCalledWith();
  });

  test('does not rebound if another value is received', function () {
    let p = pipe(rebound(100));
    let f = jest.fn();
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
    let p = pipe(rebound(100));
    let f = jest.fn();
    p.connect(f);

    p.send('test');
    jest.advanceTimersByTime(150);
    p.send('another');
    jest.advanceTimersByTime(150);

    expect(f).toHaveBeenCalledTimes(4);
  });

  test('rebound with custom base value', function () {
    let p = pipe(rebound(100, 'untest'));
    let f = jest.fn();
    p.connect(f);

    p.send('test');
    jest.runAllTimers();

    expect(f).toHaveBeenLastCalledWith('untest');
  });

  test('rebound with multiple values', function () {
    let p = pipe(rebound(100, 'untest', 'another'));
    let f = jest.fn();
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
    let p = pipe(filter(isTrue));
    let f = jest.fn();
    p.connect(f);

    p.send('truthy');

    expect(f).toHaveBeenCalledWith('truthy');
  });

  test('do not send where predicate returns false', function () {
    let p = pipe(filter(isTrue));
    let f = jest.fn();
    p.connect(f);

    p.send('');

    expect(f).not.toHaveBeenCalled();
  });

  test('relay multiple values', function () {
    let p = pipe(filter(isTrue));
    let f = jest.fn();
    p.connect(f);

    p.send(true, 1, 2, 3);

    expect(f).toHaveBeenCalledWith(true, 1, 2, 3);
  });

});

describe('map', function () {

  test('apply a function to a value', function () {
    let p = pipe(map(function (x) {
      return x.toUpperCase();
    }));
    let f = jest.fn();
    p.connect(f);

    p.send('No shouting!');

    expect(f).toHaveBeenCalledWith('NO SHOUTING!');
  });

  test('apply a function to multiple arguments', function () {
    let p = pipe(map(function (...args) {
      return args.join(' ');
    }));
    let f = jest.fn();
    p.connect(f);

    p.send('No shouting,', 'please!');

    expect(f).toHaveBeenCalledWith('No shouting, please!');
  });

});

describe('reduce', function () {
  test('reduce a single value', function () {
    let p = pipe(reduce(function (current, x) {
      return current + x;
    }, 0));
    let f = jest.fn();
    p.connect(f);

    p.send(1);

    expect(f).toHaveBeenCalledWith(1);
  });

  test('reduce multiple values', function () {
    let p = pipe(reduce(function (current, x) {
      return current + x;
    }, 0));
    let f = jest.fn();
    p.connect(f);

    p.send(1);
    p.send(2);

    expect(f).toHaveBeenCalledWith(1);
    expect(f).toHaveBeenLastCalledWith(3);
  });

  test('reduce with multiple arguments', function () {
    let p = pipe(reduce(function (current, x, y, z) {
      return current + x + y + z;
    }, 0));
    let f = jest.fn();
    p.connect(f);

    p.send(1, 1, 1);
    p.send(1, 2, 3);

    expect(f).toHaveBeenCalledWith(3);
    expect(f).toHaveBeenLastCalledWith(9);
  });

});

describe('get', function () {

  test('get object key', function () {
    let p = pipe(get('test', 'default'));
    let f = jest.fn();
    p.connect(f);

    p.send({test: 'some value'});

    expect(f).toHaveBeenCalledWith('some value');
  });

  test('get default value if key does not exits', function () {
    let p = pipe(get('test', 'default'));
    let f = jest.fn();
    p.connect(f);

    p.send({foo: 'unrelated'});

    expect(f).toHaveBeenCalledWith('default');
  });

  test('get default value is value is not an object', function () {
    let p = pipe(get('test', 'default'));
    let f = jest.fn();
    p.connect(f);

    p.send(1);

    expect(f).toHaveBeenCalledWith('default');
  });

  test('get default value if value is undefined', function () {
    let p = pipe(get('test', 'default'));
    let f = jest.fn();
    p.connect(f);

    p.send(undefined);

    expect(f).toHaveBeenCalledWith('default');
  });

  test('get a path', function () {
    let p = pipe(get('test.me', 'default'));
    let f = jest.fn();
    p.connect(f);

    p.send({test: {me: 'now'}});

    expect(f).toHaveBeenCalledWith('now');
  });

  test('get the default value if key is missing', function () {
    let p = pipe(get('test.me', 'default'));
    let f = jest.fn();
    p.connect(f);

    p.send({test: {}});

    expect(f).toHaveBeenCalledWith('default');
  });

  test('get default if parent key is missing', function () {
    let p = pipe(get('test.me', 'default'));
    let f = jest.fn();
    p.connect(f);

    p.send({});

    expect(f).toHaveBeenCalledWith('default');
  });

  test('get default value if value is undefined', function () {
    let p = pipe(get('test.me', 'default'));
    let f = jest.fn();
    p.connect(f);

    p.send(undefined);

    expect(f).toHaveBeenCalledWith('default');
  });

  test('get a value from an array', function () {
    let p = pipe(get('test.0.me', 'default'));
    let f = jest.fn();
    p.connect(f);

    p.send({test: [{me: 'first'}, {me: 'second'}]});

    expect(f).toHaveBeenCalledWith('first');
  });

});

describe('splitter', function () {

  test('split a pipe', function () {
    let p = pipe();
    let s = splitter(['foo', 'bar']);
    let fooFn = jest.fn();
    let barFn = jest.fn();
    s.foo.connect(fooFn);
    s.bar.connect(barFn);
    p.connect(s.send);

    p.send({foo: 'foo value', bar: 'bar value'});

    expect(fooFn).toHaveBeenCalledWith('foo value');
    expect(barFn).toHaveBeenCalledWith('bar value');
  });

  test('send key is ignored', function () {
    let s = splitter(['send', 'bar']);

    expect(typeof s.send.connect).toBe('undefined');
  });

});

describe('always', function () {

  test('always emit the same value', function () {
    let p = pipe(always('good'));
    let f = jest.fn();
    p.connect(f);

    p.send('bad');
    p.send(11);

    expect(f).toHaveBeenCalledTimes(2);
    expect(f.mock.calls).toEqual([
      ['good'],
      ['good'],
    ]);
  });

  test('emit multiple values', function () {
    let p = pipe(always('good', 'times'));
    let f = jest.fn();
    p.connect(f);

    p.send('bad');
    p.send(11);

    expect(f).toHaveBeenCalledTimes(2);
    expect(f.mock.calls).toEqual([
      ['good', 'times'],
      ['good', 'times'],
    ]);
  });

});

describe('sticky', function () {

  test('call a callback normally when value changes', function () {
    let p = pipe(sticky(1));
    let f = jest.fn();
    p.connect(f);

    p.send(2);

    expect(f).toHaveBeenCalledWith(2);
  });

  test('same value twice', function () {
    let p = pipe(sticky(1));
    let f = jest.fn();
    p.connect(f);

    p.send(2);
    p.send(2);

    expect(f).toHaveBeenCalledTimes(1);
  });

  test('revert to original initial', function () {
    let p = pipe(sticky(1));
    let f = jest.fn();
    p.connect(f);

    p.send(2);
    p.send(2);
    p.send(1);

    expect(f).toHaveBeenCalledTimes(2);
    expect(f).toHaveBeenLastCalledWith(1);
  });

  test('with additional values', function () {
    let p = pipe(sticky(1));
    let f = jest.fn();
    p.connect(f);

    p.send(2, 2, 2);
    p.send(2, 2, 2);
    p.send(3, 3, 3);

    expect(f).toHaveBeenCalledTimes(2);
    expect(f).toHaveBeenCalledWith(2, 2, 2);
    expect(f).toHaveBeenCalledWith(3, 3, 3);
  });

  test('with additional values that change', function () {
    let p = pipe(sticky(1));
    let f = jest.fn();
    p.connect(f);

    p.send(2, 2, 2);
    p.send(2, 3, 3);
    p.send(3, 4, 4);

    expect(f).toHaveBeenCalledTimes(2);
    expect(f).toHaveBeenCalledWith(2, 2, 2);
    expect(f).toHaveBeenCalledWith(3, 4, 4);
  });
});

describe('junction', function () {

  test('create a simple junction', function () {
    let f = jest.fn();
    let p1 = pipe();
    let p2 = pipe();
    let j = junction();

    p1.connect(j.sendAs('foo'));
    p2.connect(j.sendAs('bar'));
    j.connect(f);

    p1.send('test');
    expect(f).toHaveBeenCalledWith({foo: 'test'});

    p2.send('me');
    expect(f).toHaveBeenCalledWith({foo: 'test', bar: 'me'});

    p1.send('now');
    expect(f).toHaveBeenCalledWith({foo: 'now', bar: 'me'});
  });

  test('use initial state', function () {
    let f = jest.fn();
    let p1 = pipe();
    let p2 = pipe();
    let j = junction({foo: 'nothing', bar: 'nothing'});

    p1.connect(j.sendAs('foo'));
    p2.connect(j.sendAs('bar'));
    j.connect(f);

    p1.send('test');
    expect(f).toHaveBeenCalledWith({foo: 'test', bar: 'nothing'});
  });

});
