> Yes, this is another fork. Of the fork. I'm sorry.
This fork enables bootstrap appearance, like this:
```
<Compobox appearance='bootstrap' ... />
```
Also, it has a mode, in which it shrinks to it's content. Can be useful as inline component:
```
<Compobox shrink={true} shrinkMinSize={100}  ... />
```
Installation: 
```
$ npm install @alexkuz/react-autocomplete
```

#

> A quick, friendly fork aimed at making the original lib easier to consume, when using with:
* React v0.12.x or v0.13.x
* many configurations of webpack/browserify/etc. (alternative: configure your loader to transform the lib's JSX).

> `npm install colinhicks/react-autocomplete`
```js
import {Combobox, Option} from 'react-autocomplete';
```


> Original readme preserved below ...

react-autocomplete (combobox)
=============================

[WAI-ARIA][wai-aria] accessible [React][react] autocomplete component (combobox).

Installation
------------

`npm install react-autocomplete`

WIP
---

This is not production ready, but I welcome use-cases opened in the
issues :)

Demo
----

http://rackt.github.io/react-autocomplete/example/

Usage
-----

```js
var Autocomplete = require('react-autocomplete');

// its actually called a combobox, but noboby searches for that
var Combobox = Autocomplete.Combobox; 
var Option = Autocomplete.Option;

var comboboxinItUp = (

  // Just like <select><option/></select>, this component is a
  // composite component. This gives you complete control over
  // What is displayed inside the <Option>s as well as allowing
  // you to render whatever you want inside, like a "no results"
  // message that isn't interactive like the <Options> are.

  // Start with the <Combobox/> and give it some handlers.

  <Combobox
    onInput={handleInput}
    onSelect={handleSelect}
    autocomplete="both"
  >

    // `onInput` is called when the user is typing, it gets passed the
    // value from the input. This is your chance to filter the Options
    // and redraw. More realistically, you'd make a request to get data
    // and then redraw when it lands.
    //
    // `onSelect` is called when the user makes a selection, you probably
    // want to reset the Options to your full dataset again, or maybe
    // deal with the value and then clear it out if this is used to
    // populate a list.
    //
    // `autocomplete` defaults to 'both'. 'inline' will autocomplete the
    // first matched Option into the input value, 'list' will display a
    // list of choices, and of course, both does both.
 
    // When this option is selected, `onSelect` will be called with the
    // value `"foo"`.
    <Option value="foo">Foo</Option>

    // `label` is the text to display in the input when the Option is
    // selected. It defaults to the content of the Option just like a
    // real <option>. (Maybe the value should too, now that I'm writing
    // this, but it doesn't yet)
    <Option value="bar" label="not bar at all">Bar</Option>
  </Combobox>
);
```

This is not realistic code, check out the examples directory for a real
implementation.

  [wai-aria]:http://www.w3.org/TR/wai-aria/roles#combobox
  [react]:http://facebook.github.io/react/

