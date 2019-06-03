[![Build Status](https://travis-ci.org/foxbunny/transplexer-tools.svg?branch=master)](https://travis-ci.org/foxbunny/transplexer-tools)

# Transplexer tools

Essential tools for [transplexer](https://github.com/foxbunny/transplexer).

## Overview

This package contains a library of tools for transplexer, the lightweight
reactive programming library.

The tools include utility functions as well as canned transformers that can be
used directly.

## Installation

Install from the NPM repository with NPM:

```bash
npm install --save-dev transplexer-tools
```

or with Yarn:

```bash
yarn add --dev transplexer-tools
```

## Utility functions

### `toTransformer(fn)`

This function takes a pure function and converts it into a transformer.

Example:

```javascript
import pipe from 'transplexer';
import {toTransformer} from 'transplexer-tools';

cont p = pipe(
  toTransformer(x => x + 1),
  toTransformer(x => x * 2),
);
```

## Transformers

### `merge`

This transformer merges incoming objects into a single object. This is a
stateful transformer whose state persists throughout the life of the pipe in
which it is used.

This transformer is usually used at the very start of a pipe in order to
combine the inputs from several sources.

Merge internally users `Object.assing()` in order to mutate the current state.
This means that all rules regarding `Object.assign()` apply. The incoming
value's keys will override the existing keys, for example.

Example:

```javascript
import pipe from 'transplexer';
import {merge} from 'transplexer-tools';

const location = pipe();
const user = pipe();
const state = pipe(merge);

state.connect(function (s) {
  console.log(JSON.stringify(s));
});
location.connect(state.send);
user.connect(state.send);

location.send({location: '/'}); // logs {"location":"/"}
user.send({userId: 2}); // logs {"location":"/","userId":2}
```

### `debounce(time)`

Debouncing is a common technique to limit the rate at which expensive code is
exercised when faced with a high-trigger-rate event. Deboucing works by
preventing the values from passing through until a specified period of calm is
detected. For instance, if we specify a debounce of 200ms, values will not pass
until at least 200ms passes since the last value was received (e.g., last
keystroke if we are deboucing the input events). Once the calm is detected,
only the last value received will go through.

This method is commonly used when the intention is to wait for things to
settle. For example, if the feedback to an event is not very useful
immediately, but beomes useful as soon as the user stops triggering it, we use
deboucing. Common examples include autocomplete and form field validation.

Example:

```javascript
import pipe from 'transplexer';
import {debounce} from 'transplexer-tools';

const autocompletePipe = pipe(debounce(200), autocompleteRequest);
autocompletePipe.connect(updateSuggestionList);

document
  .querySelector('input.autocomplete')
  .addEventListener('input', autocompletePipe.send, false);
```

### `throttle(interval)`

Throttle is a common technique to reduce the rate at which expensive code is
exercised when faced with a high-trigger-rate event. Throttling achieves this
by allowing values to pass through only at specified interval. If the time gap
between two values is less than the interval, then the new value is discarded.

Throttling is used when timely feedback to events is desirable but frequent 
feedback is prohibitively expensive. Common examples are filtering lists based
on XHR requests, and performing expensive DOM updates on drag or scroll action.

Example:

```javascript
import pipe from 'transplexer';
import {throttle} from 'transplexer-tools';

const parallaxPipe = pipe(throttle(30));
parallaxPipe.connect(updateParallax);

window.addEventListener('scroll', parallaxPipe.send, false);
```

### `rebound(time, ...baseValues)`

This transformer reverts the pipe to base values with a specified delay after a
value is received. Rebounding can be used for things that appear temporarily,
like error messages and notifications.

There can be multiple values that get sent when the pipe rebounds. Any
positional arguments after the time are sent. By default, the connected
callbacks (and any transformer following this one) are invoked without
arguments on rebound.

Example:

```javascript
import pipe from 'transplexer';
import {rebound} from 'transplexer-tools';

const messagePipe = pipe(rebound(5000, ''));
messagePipe.connect(showMessage);

messagePipe.send('Hello, rebound!');
```

The above example will send 'Hello, robound!' immediately, and then an empty
string after approximately five seconds.

### `filter(testFn)`

This transformer will filter the value for which the test function returns a
truthy value. 

Although this can be useful in a variety of creative ways, one of the users is
to split a pipe into two branches. Here's an example of such usage:

```javascript
import pipe from 'transplexer';
import {filter} from 'transplexer-tools';

const truePipe = pipe(filter(function (x) { return x; }));
truePipe.connect(incrementTrueCount);

const falsePipe = pipe(filter(function (x) { return !x; }));
truePipe.connect(incrementFalseCount);

const p = pipe();
p.connect(truePipe.send);
p.connect(falsePipe.send);

p.send(false);
```

### `map(fn)`

In many languages, there are functions that apply other functions to all values
in a list or array or some other container type. The `map()` transformer serves
the same purpose. It applies a function to all values passing through the pipe
and passes the return value on to the next transformer.

Because a JavaScript function can only return a single value, this transformer
will narrow the pipe down to a single value. This is acceptable in most cases,
but if you need to pass on multiple values, then you should write a transformer
instead.

Example:

```javascript
import pipe from 'transplexer';
import {map} from 'transplexer-tools';

const incPipe = pipe(map(function (x) { return x + 1; }));
incPipe.connect(console.log);

incPipe.send(1); // logs 2
```

### `reduce(fn, initialValue)`

This transformer works similarly to `reduce()` in arrays, with the difference
that there is no final value as pipes are a potentially never-ending stream of
values. Think of it as running reduce.

The function passed as the first argument receives the current state as its
first argument, followed by one or more arguments coming from the previous
transformer or `send()` function, and it is expected to return a single value
that replaces the `initialValue` as the new state. This new value is then
passed on to the next transformer or the connected callbacks.

Reduce can be useful for situations where you need persistante state that
changes over time. A simplest example of this is a counter, but more complex
things can be done depending on the initial value.

Example:

```javascript
import pipe from 'transplexer';
import {reduce} from 'transplexer-tools';

const counter = pipe(reduce(function (count) {
  return count + 1;
}), 0);
counter.connect(updateCounterUI);

document.addEventListener('click', counter.send, false);
```
