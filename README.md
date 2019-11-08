[![Build Status](https://travis-ci.org/foxbunny/transplexer-tools.svg?branch=master)](https://travis-ci.org/foxbunny/transplexer-tools)

# Transplexer tools

Essential tools for [transplexer](https://github.com/foxbunny/transplexer).

## Overview

This package contains a library of tools for transplexer, the lightweight
reactive programming library.

The tools include utility functions as well as canned transformers that can be
used directly.

## Contents

<!-- vim-markdown-toc GFM -->

* [Installation](#installation)
* [Utility functions](#utility-functions)
  * [`toTransformer(fn)`](#totransformerfn)
* [Transformers](#transformers)
  * [`merge`](#merge)
  * [`debounce(time)`](#debouncetime)
  * [`throttle(interval)`](#throttleinterval)
  * [`rebound(time, ...baseValues)`](#reboundtime-basevalues)
  * [`filter(testFn)`](#filtertestfn)
  * [`map(fn)`](#mapfn)
  * [`reduce(fn, initialValue)`](#reducefn-initialvalue)
  * [`get(path, defaultValue)`](#getpath-defaultvalue)
  * [`always(...values)`](#alwaysvalues)
  * [`sticky(initialValue)`](#stickyinitialvalue)
  * [`aside(fn)`](#asidefn)
* [Receiver functions](#receiver-functions)
  * [`splitter(keys, ignoreMissingKeys = false)`](#splitterkeys-ignoremissingkeys--false)
  * [`junction(initialState)`](#junctioninitialstate)

<!-- vim-markdown-toc -->

## Installation

Install from the NPM repository with NPM:

```bash
npm install transplexer-tools
```

or with Yarn:

```bash
yarn add transplexer-tools
```

## Utility functions

Utility functions are functions that are used to build other types of tools.

### `toTransformer(fn)`

**WARNING:** This function is deprecated. Use `map()` instead, which is
identical in behavior. `toTransformer()` is currently just an alias for `map()`
and will be removed in the next major release.

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

This package provides a selection of transformers and transformer factories.
Transformer factories are functions that take parameters and return
transformers.

### `merge`

Merge incoming objects into a single one.

This is a stateful transformer whose state persists throughout the life of the
pipe in which it is used.

This transformer is usually used at the very start of a pipe in order to
combine the inputs from several sources.

Merge internally uses `Object.assing()` in order to mutate the current state.
This means that all rules regarding `Object.assign()` apply. The incoming
value's keys will override the existing keys, for example.

Example:

```javascript
import pipe from 'transplexer';
import {merge} from 'transplexer-tools';

let location = pipe();
let user = pipe();
let state = pipe(merge);

state.connect(function (s) {
  console.log(JSON.stringify(s));
});
location.connect(state.send);
user.connect(state.send);

location.send({location: '/'}); // logs {"location":"/"}
user.send({userId: 2}); // logs {"location":"/","userId":2}
```

### `debounce(time)`

Debounce the flow of values.

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

let autocompletePipe = pipe(debounce(200), autocompleteRequest);
autocompletePipe.connect(updateSuggestionList);

document
  .querySelector('input.autocomplete')
  .addEventListener('input', autocompletePipe.send, false);
```

### `throttle(interval)`

Transformers that limits the flow of values to once in a specified interval.

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

let parallaxPipe = pipe(throttle(30));
parallaxPipe.connect(updateParallax);

window.addEventListener('scroll', parallaxPipe.send, false);
```

### `rebound(time, ...baseValues)`

Send base value after a specified time after each transmitted value.

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

let messagePipe = pipe(rebound(5000, ''));
messagePipe.connect(showMessage);

messagePipe.send('Hello, rebound!');
```

The above example will send 'Hello, robound!' immediately, and then an empty
string after approximately five seconds.

The timer is reset every time a value reaches the transformer, so if we send
multiple values down a pipe within the five second timeout, the empty string is
sent only once, five seconds after the *last* value.

### `filter(testFn)`

Filter values for which the test function returns truthy.

Although this can be useful in a variety of creative ways, one of the users is
to split a pipe into two branches. Here's an example of such usage:

```javascript
import pipe from 'transplexer';
import {filter} from 'transplexer-tools';

let truePipe = pipe(filter(function (x) { return x; }));
truePipe.connect(incrementTrueCount);

let falsePipe = pipe(filter(function (x) { return !x; }));
truePipe.connect(incrementFalseCount);

let p = pipe();
p.connect(truePipe.send);
p.connect(falsePipe.send);

p.send(false);
```

### `map(fn)`

Apply a function to all values and transmit the return values.

In many languages, there are functions that apply other functions to all values
in a list or array or some other container type. The `map()` transformer serves
the same purpose. It applies a function to all values passing through the pipe
and passes the return value on to the next transformer.

Because a JavaScript function can only return a single value, this transformer
will narrow the pipe down to a single value. This is acceptable in most cases,
but if we need to pass on multiple values, then we write a transformer instead.

Example:

```javascript
import pipe from 'transplexer';
import {map} from 'transplexer-tools';

let incPipe = pipe(map(function (x) { return x + 1; }));
incPipe.connect(console.log);

incPipe.send(1); // logs 2
```

### `reduce(fn, initialValue)`

Reduce (collapse) incoming values to a single value according to a function.

This transformer works similarly to `reduce()` in arrays, with the difference
that there is no final value as pipes are a potentially never-ending stream of
values. Think of it as running reduce.

The function passed as the first argument receives the current state as its
first argument, followed by one or more arguments coming from the previous
transformer or `send()` function, and it is expected to return a single value
that replaces the `initialValue` as the new state. This new value is then
passed on to the next transformer or the connected callbacks.

Reduce can be useful for situations where we need persistent state that changes
over time. A simplest example of this is a counter, but more complex things can
be done depending on the initial value.

Example:

```javascript
import pipe from 'transplexer';
import {reduce} from 'transplexer-tools';

let counter = pipe(reduce(function (count) {
  return count + 1;
}), 0);
counter.connect(updateCounterUI);

document.addEventListener('click', counter.send, false);
```

### `get(path, defaultValue)`

Get a value at specified path or return a default value if key is undefined.

This transformer will take any object coming down the pipe and return a value
that corresponds to the dot-separated path within the object. If such a path or
a value does not exist, it transmits the default value.

The path can be composed of any numbers of keys or array indices. For example,
to reach `'baz'` in `{foo: {bar: 'baz'}}`, we would use a path `'foo.bar'`.

Example:

```javascript
import pipe from 'transplexer';
import {get} from 'transplexer-tools';

let firstUserName = pipe(get('0.name', 'unknown'));
firstUserName.connect(console.log);

firstUserName.send([
  {name: 'John', email: 'jdoe@example.com'},
  {name: 'Jane', email: 'doej@example.com'},
]);
// logs 'John'

firstUserName.send([]);
// logs 'unknown'
```

### `always(...values)`

Always emit the same values whenever any values are received.

This transformer ignores the received values and always transmits the same
values. This is similar to doing the following:

```javascript
pipe(map(function () {
  return someValue;
}));
```

The main difference compared to the example is that `always()` can pass on
multiple values, whereas the example can only pass on one. Another subtle, but
important difference is that the value in the example is evaluated when the
callback is called, whereas with `always()`, all the values are evaluated only
once when the pipe is being configured. This may be a problem for mutable
values like objects or arrays, so in such cases, we prefer to use `map()` or
write a custom transformer.

Example:

```javascript
let p = pipe(always('click'));
p.connect(console.log);

document.addEventListener('click', p.send, false);
// logs 'click' whenever page is clicked
```

### `sticky(initialValue)`

Only passes on values if they are different to last one.

This transformer will refuse to pass on values that are identical to the
previous value. The values are compared for identity (`===`).

Example:

```javascript
let p = pipe(sticky(0));
p.connect(console.log);

p.send(0);
p.send(1);
p.send(1);
// Only logs '1' once.

p.send(0);
// Now logs '0'.
```

This transformer only checks the first argument for equality. The rest of the
arguments are ignored. For example:

```javascript
let p = pipe(sticky(0));
p.connect(console.log);

p.send(0, 'a', false);
p.send(1, 'b', true);
p.send(1, 'c', true);
// Logs only '1 b true'

p.send(0, 'd', false);
// Now logs '0 d false'.
```

### `aside(fn)`

This transformer invokes the callback for each set of values, but it ignores
the result and passes the values as-is to the next transformer.

This can be useful for debugging or implemneting side effects that should not
be visible downstream.

Example:

```javascript
let p = pipe(aside(console.log));
```

The above code produces a pass-through pipe that logs every input.

## Receiver functions

Receiver functions are utility functions that are used as connected callbacks
in a pipe. They may also be factory functions that produce functions and
objects that can be used as receivers. Receivers usually serve as mediators
between two pipes.

### `splitter(keys, ignoreMissingKeys = false)`

Create an object that splits incoming objects into individual keys.

This function takes an array of keys and creates a pipe-like object called a
'splitter'. 

**NOTE:** The key 'send' cannot be used in the `keys` array.

Splitter objects have a `send()` method that can be used to connect the
splitter to a pipe. 

It also has a property for each key in the `keys` array. These properties are
pipes. Whenever the splitter receives an object, for each key of that object, a
matching pipe in the splitter will transmit the value of that key.

For example:

```javascript
import pipe from 'transplexer';
import {splitter} from 'transplexer-tools';

let userPipe = pipe();
let userProperties = splitter(['name', 'email']);

userPipe.connect(userProperties.send);

userProperties.name.connect(function (name) {
  console.log('name is ', name);
});

userProperties.email.connect(function (email) {
  console.log('email is', email);
});

userPipe.send({name: 'John', email: 'doe@example.com'});
// logs 'name is John' and 'email is doe@example.com'

userPipe.send({name: 'Jane'});
// logs 'name is Jane' and 'email is undefined'
```

As can be seen in the example above, pipes for missing keys also receive a
value, and the value is `undefined`. This behavior can be changed by passing
true as the second argument:

```javascript
import pipe from 'transplexer';
import {splitter} from 'transplexer-tools';

let userPipe = pipe();
let userProperties = splitter(['name', 'email'], true);

userPipe.connect(userProperties.send);

userProperties.name.connect(function (name) {
  console.log('name is ', name);
});

userProperties.email.connect(function (email) {
  console.log('email is', email);
});

userPipe.send({name: 'John', email: 'doe@example.com'});
// logs 'name is John' and 'email is doe@example.com'

userPipe.send({name: 'Jane'});
// logs 'name is Jane' only, email pipe is ignored
```

### `junction(initialState)`

Create a stateful pipe junction.

Junctions merge values coming down different pipes into an object, and provides
a pipe that transmits these objects. The object in a junction maintains its
shape throughout the life of the junction: as new values come down the source
pipes, they are merged into the object, and the rest of the object remains
intact. This is why we say junctions are stateful.

The initial state of the object is specified as an argument to the `junction()`
function. If omitted, the initial state is an empty object.

Pipes are connected to junctions at a specified key. Therefore, values coming
down a pipe will be assigned to the specified key on the junction object. A
callback function that pipes can be connected to is created using the
junction's `sendAs()` method, which takes the name of the key and returns a
callback.

Junctions also have a `connect()` method which behaves the same way as in
normal pipes.

For example:

```javascript
import pipe from 'transplexer';
import {junction} from 'transplexer-tools';

let j = junction();
let p = pipe();

p.connect(j.sendAs('myKey'));
j.connect(console.log);

p.send('test');

// logs '{myKey: 'test'}'
```

Just like pipes, junctions support transformers. These are specified as
additional arguments after the initial state. Note that, if we wish to specify
transformers, we must specify the initial state. Any number of arguments can be
specified.

```javascript
import pipe from 'transplexer';
import {junction} from 'transplexer-tools';

let j = junction({}, function (obj) {
  return {...obj, myKey: obj.myKey + ' from map'};
});
let p = pipe();

p.connect(j.sendAs('myKey'));
j.connect(console.log);

p.send('test');

// logs '{myKey: 'test from map'}'
```

Junctions assume that each source pipe will only transmit a single value. All
additional arguments are ignored.
