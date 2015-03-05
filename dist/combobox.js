"use strict";

var React = require("react");
var guid = 0;
var k = function k() {};
var addClass = require("./add-class");
var ComboboxOption = require("./option");

module.exports = React.createClass({
  displayName: "exports",

  propTypes: {

    /**
     * Defaults to 'both'. 'inline' will autocomplete the first matched Option
     * into the input value, 'list' will display a list of choices, and of
     * course, both does both (do you have a soft 'L' in there when you say
     * "both" out loud?)
    */
    autocomplete: React.PropTypes.oneOf(["both", "inline", "list"]),

    /**
     * Called when the combobox receives user input, this is your chance to
     * filter the data and rerender the options.
     *
     * Signature:
     *
     * ```js
     * function(userInput){}
     * ```
    */
    onInput: React.PropTypes.func,

    /**
     * Called when the combobox receives a selection. You probably want to reset
     * the options to the full list at this point.
     *
     * Signature:
     *
     * ```js
     * function(selectedValue){}
     * ```
    */
    onSelect: React.PropTypes.func,

    /**
     * The initial value of the component.
    */
    value: React.PropTypes.any
  },

  getDefaultProps: function getDefaultProps() {
    return {
      autocomplete: "both",
      onInput: k,
      onSelect: k,
      value: null
    };
  },

  getInitialState: function getInitialState() {
    return {
      value: this.props.value,
      // the value displayed in the input
      inputValue: this.findInputValue(),
      isOpen: false,
      focusedIndex: null,
      matchedAutocompleteOption: null,
      // this prevents crazy jumpiness since we focus options on mouseenter
      usingKeyboard: false,
      activedescendant: null,
      listId: "rf-combobox-list-" + ++guid,
      menu: {
        children: [],
        activedescendant: null,
        isEmpty: true
      }
    };
  },

  componentWillMount: function componentWillMount() {
    this.setState({ menu: this.makeMenu() });
  },

  componentWillReceiveProps: function componentWillReceiveProps(newProps) {
    this.setState({
      menu: this.makeMenu(newProps.children)
    });
  },

  /**
   * We don't create the <ComboboxOption> components, the user supplies them,
   * so before rendering we attach handlers to facilitate communication from
   * the ComboboxOption to the Combobox.
  */
  makeMenu: function makeMenu(children) {
    var activedescendant;
    var isEmpty = true;
    children = children || this.props.children;
    React.Children.forEach(children, (function (child, index) {
      if (child.type !== ComboboxOption.type)
        // allow random elements to live in this list
        return;
      isEmpty = false;
      // TODO: cloneWithProps and map instead of altering the children in-place
      var props = child.props;
      if (this.state.value === props.value) {
        // need an ID for WAI-ARIA
        props.id = props.id || "rf-combobox-selected-" + ++guid;
        props.isSelected = true;
        activedescendant = props.id;
      }
      props.onBlur = this.handleOptionBlur;
      props.onClick = this.selectOption.bind(this, child);
      props.onFocus = this.handleOptionFocus;
      props.onKeyDown = this.handleOptionKeyDown.bind(this, child);
      props.onMouseEnter = this.handleOptionMouseEnter.bind(this, index);
    }).bind(this));
    return {
      children: children,
      activedescendant: activedescendant,
      isEmpty: isEmpty
    };
  },

  getClassName: function getClassName() {
    var className = addClass(this.props.className, "rf-combobox");
    if (this.state.isOpen) className = addClass(className, "rf-combobox-is-open");
    return className;
  },

  /**
   * When the user begins typing again we need to clear out any state that has
   * to do with an existing or potential selection.
  */
  clearSelectedState: function clearSelectedState(cb) {
    this.setState({
      focusedIndex: null,
      inputValue: null,
      value: null,
      matchedAutocompleteOption: null,
      activedescendant: null
    }, cb);
  },

  handleInputChange: function handleInputChange(event) {
    var value = this.refs.input.getDOMNode().value;
    this.clearSelectedState((function () {
      this.props.onInput(value);
      if (!this.state.isOpen) this.showList();
    }).bind(this));
  },

  handleInputBlur: function handleInputBlur() {
    var focusedAnOption = this.state.focusedIndex != null;
    if (focusedAnOption) {
      return;
    }this.maybeSelectAutocompletedOption();
    this.hideList();
  },

  handleOptionBlur: function handleOptionBlur() {
    // don't want to hide the list if we focused another option
    this.blurTimer = setTimeout(this.hideList, 0);
  },

  handleOptionFocus: function handleOptionFocus() {
    // see `handleOptionBlur`
    clearTimeout(this.blurTimer);
  },

  handleInputKeyUp: function handleInputKeyUp(event) {
    if (this.state.menu.isEmpty ||
    // autocompleting while backspacing feels super weird, so let's not
    event.keyCode === 8 /*backspace*/ || !this.props.autocomplete.match(/both|inline/)) {
      return;
    }this.autocompleteInputValue();
  },

  /**
   * Autocompletes the input value with a matching label of the first
   * ComboboxOption in the list and selects only the fragment that has
   * been added, allowing the user to keep typing naturally.
  */
  autocompleteInputValue: function autocompleteInputValue() {
    if (this.props.autocomplete == false || this.props.children.length === 0) {
      return;
    }var input = this.refs.input.getDOMNode();
    var inputValue = input.value;
    var firstChild = this.props.children.length ? this.props.children[0] : this.props.children;
    var label = getLabel(firstChild);
    var fragment = matchFragment(inputValue, label);
    if (!fragment) {
      return;
    }input.value = label;
    input.setSelectionRange(inputValue.length, label.length);
    this.setState({ matchedAutocompleteOption: firstChild });
  },

  handleButtonClick: function handleButtonClick() {
    this.state.isOpen ? this.hideList() : this.showList();
    this.focusInput();
  },

  showList: function showList() {
    if (this.props.autocomplete.match(/both|list/)) this.setState({ isOpen: true });
  },

  hideList: function hideList() {
    this.setState({ isOpen: false });
  },

  hideOnEscape: function hideOnEscape() {
    this.hideList();
    this.focusInput();
  },

  focusInput: function focusInput() {
    this.refs.input.getDOMNode().focus();
  },

  selectInput: function selectInput() {
    this.refs.input.getDOMNode().select();
  },

  inputKeydownMap: {
    38: "focusPrevious",
    40: "focusNext",
    27: "hideOnEscape",
    13: "selectOnEnter"
  },

  optionKeydownMap: {
    38: "focusPrevious",
    40: "focusNext",
    13: "selectOption",
    27: "hideOnEscape"
  },

  handleKeydown: function handleKeydown(event) {
    var handlerName = this.inputKeydownMap[event.keyCode];
    if (!handlerName) {
      return;
    }event.preventDefault();
    this.setState({ usingKeyboard: true });
    this[handlerName].call(this);
  },

  handleOptionKeyDown: function handleOptionKeyDown(child, event) {
    var handlerName = this.optionKeydownMap[event.keyCode];
    if (!handlerName) {
      // if the user starts typing again while focused on an option, move focus
      // to the input, select so it wipes out any existing value
      this.selectInput();
      return;
    }
    event.preventDefault();
    this.setState({ usingKeyboard: true });
    this[handlerName].call(this, child);
  },

  handleOptionMouseEnter: function handleOptionMouseEnter(index) {
    if (this.state.usingKeyboard) this.setState({ usingKeyboard: false });else this.focusOptionAtIndex(index);
  },

  selectOnEnter: function selectOnEnter() {
    this.maybeSelectAutocompletedOption();
    this.refs.input.getDOMNode().select();
  },

  maybeSelectAutocompletedOption: function maybeSelectAutocompletedOption() {
    if (!this.state.matchedAutocompleteOption) {
      return;
    }this.selectOption(this.state.matchedAutocompleteOption, { focus: false });
  },

  selectOption: function selectOption(child, options) {
    options = options || {};
    this.setState({
      value: child.props.value,
      inputValue: getLabel(child),
      matchedAutocompleteOption: null
    }, (function () {
      this.props.onSelect(child.props.value, child);
      this.hideList();
      if (options.focus !== false) this.selectInput();
    }).bind(this));
  },

  focusNext: function focusNext() {
    if (this.state.menu.isEmpty) {
      return;
    }var index = this.state.focusedIndex == null ? 0 : this.state.focusedIndex + 1;
    this.focusOptionAtIndex(index);
  },

  focusPrevious: function focusPrevious() {
    if (this.state.menu.isEmpty) {
      return;
    }var last = this.props.children.length - 1;
    var index = this.state.focusedIndex == null ? last : this.state.focusedIndex - 1;
    this.focusOptionAtIndex(index);
  },

  focusSelectedOption: function focusSelectedOption() {
    var selectedIndex;
    React.Children.forEach(this.props.children, (function (child, index) {
      if (child.props.value === this.state.value) selectedIndex = index;
    }).bind(this));
    this.showList();
    this.setState({
      focusedIndex: selectedIndex
    }, this.focusOption);
  },

  findInputValue: function findInputValue(value) {
    value = value || this.props.value;
    // TODO: might not need this, we should know this in `makeMenu`
    var inputValue;
    React.Children.forEach(this.props.children, function (child) {
      if (child.props.value === value) inputValue = getLabel(child);
    });
    return inputValue || value;
  },

  focusOptionAtIndex: function focusOptionAtIndex(index) {
    if (!this.state.isOpen && this.state.value) {
      return this.focusSelectedOption();
    }this.showList();
    var length = this.props.children.length;
    if (index === -1) index = length - 1;else if (index === length) index = 0;
    this.setState({
      focusedIndex: index
    }, this.focusOption);
  },

  focusOption: function focusOption() {
    var index = this.state.focusedIndex;
    this.refs.list.getDOMNode().childNodes[index].focus();
  },

  render: function render() {
    return React.createElement(
      "div",
      { className: this.getClassName() },
      React.createElement("input", {
        ref: "input",
        className: "rf-combobox-input",
        defaultValue: this.props.value,
        value: this.state.inputValue,
        onChange: this.handleInputChange,
        onBlur: this.handleInputBlur,
        onKeyDown: this.handleKeydown,
        onKeyUp: this.handleInputKeyUp,
        role: "combobox",
        "aria-activedescendant": this.state.menu.activedescendant,
        "aria-autocomplete": this.props.autocomplete,
        "aria-owns": this.state.listId
      }),
      React.createElement(
        "span",
        {
          "aria-hidden": "true",
          className: "rf-combobox-button",
          onClick: this.handleButtonClick
        },
        "▾"
      ),
      React.createElement(
        "div",
        {
          id: this.state.listId,
          ref: "list",
          className: "rf-combobox-list",
          "aria-expanded": this.state.isOpen + "",
          role: "listbox"
        },
        this.state.menu.children
      )
    );
  }
});

function getLabel(component) {
  var hasLabel = component.props.label != null;
  return hasLabel ? component.props.label : component.props.children;
}

function matchFragment(userInput, firstChildLabel) {
  userInput = userInput.toLowerCase();
  firstChildLabel = firstChildLabel.toLowerCase();
  if (userInput === "" || userInput === firstChildLabel) {
    return false;
  }if (firstChildLabel.toLowerCase().indexOf(userInput.toLowerCase()) === -1) {
    return false;
  }return true;
}