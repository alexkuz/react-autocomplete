var React = require('react');
var guid = 0;
var k = function(){};
var ComboboxOption = require('./option');

module.exports = React.createClass({
  displayName: 'Combobox',

  propTypes: {

    /**
     * Defaults to 'both'. 'inline' will autocomplete the first matched Option
     * into the input value, 'list' will display a list of choices, and of
     * course, both does both (do you have a soft 'L' in there when you say
     * "both" out loud?)
    */
    autocomplete: React.PropTypes.oneOf(['both', 'inline', 'list']),

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
    value: React.PropTypes.any,

    appearance: React.PropTypes.oneOf(['rf', 'bootstrap', 'bootstrap-small', 'bootstrap-large']),

    shrink: React.PropTypes.bool,

    label: React.PropTypes.any
  },

  getDefaultProps: function() {
    return {
      autocomplete: 'both',
      onInput: k,
      onSelect: k,
      value: null,
      appearance: 'rf',
      shrink: false
    };
  },


  getAppearance() {
    var appearances = {
      rf: {
        combobox: 'rf-combobox',
        open: 'rf-combobox-is-open',
        selected: 'rf-combobox-selected',
        input: 'rf-combobox-input',
        button: 'rf-combobox-button',
        caret: '',
        list: 'rf-combobox-list',
        option: 'rf-combobox-option',
        label: ''
      },

      bootstrap: {
        combobox: 'input-group',
        open: 'open',
        selected: 'active',
        input: 'form-control',
        button: 'input-group-btn',
        caret: 'caret',
        list: 'dropdown-menu',
        option: 'dropdown-option',
        label: 'control-label'
      }
    };

    appearances['bootstrap-small'] = Object.assign(
      {},
      appearances.bootstrap,
      { input: 'form-control input-sm' }
    );

    appearances['bootstrap-large'] = Object.assign(
      {},
      appearances.bootstrap,
      { input: 'form-control input-lg' }
    );

    return appearances[this.props.appearance];
  },

  getInitialState: function() {
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
      listId: 'rf-combobox-list-'+(++guid),
      menu: {
        children: [],
        activedescendant: null,
        isEmpty: true
      },
      shrinkWidth: 100
    };
  },

  componentWillMount: function() {
    this.setState({menu: this.makeMenu()});
  },

  componentDidMount: function() {
    this.updateWidth();
  },

  componentWillReceiveProps: function(newProps) {
    this.setState({
      menu: this.makeMenu(newProps.children)
    });
  },

  componentDidUpdate: function(prevProps, prevState) {
    if (prevState.inputValue !== this.state.inputValue ||
        prevState.matchedAutocompleteOption !== this.state.matchedAutocompleteOption) {
      this.updateWidth();
    }
  },

  /**
   * We don't create the <ComboboxOption> components, the user supplies them,
   * so before rendering we attach handlers to facilitate communication from
   * the ComboboxOption to the Combobox.
  */
  makeMenu: function(children) {
    var activedescendant;
    var isEmpty = true;
    children = children || this.props.children;
    var appearance = this.getAppearance();
    var clonedChildren = React.Children.map(children, function(child, index) {
      isEmpty = false;
      var props = {};
      if (this.state.value === child.props.value) {
        // need an ID for WAI-ARIA
        props.id = child.props.id || 'rf-combobox-selected-'+(++guid);
        props.isSelected = true;
        props.className = [child.props.className, appearance.option, appearance.selected].join(' ');
        activedescendant = child.props.id;
      }
      props.onBlur = this.handleOptionBlur;
      props.onClick = this.selectOption.bind(this, child);
      props.onFocus = this.handleOptionFocus;
      props.onKeyDown = this.handleOptionKeyDown.bind(this, child);
      props.onMouseEnter = this.handleOptionMouseEnter.bind(this, index);
      return React.cloneElement(child, props);
    }.bind(this));
    return {
      children: clonedChildren,
      activedescendant: activedescendant,
      isEmpty: isEmpty
    };
  },

  getClassName: function() {
    var appearance = this.getAppearance();
    var classNames = [this.props.className, appearance.combobox];
    if (this.state.isOpen) {
      classNames.push(appearance.open);
    }
    return classNames.join(' ');
  },

  /**
   * When the user begins typing again we need to clear out any state that has
   * to do with an existing or potential selection.
  */
  clearSelectedState: function(cb) {
    this.setState({
      focusedIndex: null,
      inputValue: null,
      value: null,
      matchedAutocompleteOption: null,
      activedescendant: null
    }, cb);
  },

  handleInputChange: function(event) {
    var value = React.findDOMNode(this.refs.input).value;
    this.clearSelectedState(function() {
      this.props.onInput(value);
      if (!this.state.isOpen)
        this.showList();
    }.bind(this));
  },

  handleInputBlur: function() {
    var focusedAnOption = this.state.focusedIndex != null;
    if (focusedAnOption)
      return;
    this.maybeSelectAutocompletedOption();
    this.hideList();
    if (this.props.onBlur) {
      this.props.onBlur();
    }
  },

  handleInputFocus: function() {
    if (this.props.onFocus) {
      this.props.onFocus();
    }
  },

  handleOptionBlur: function() {
    // don't want to hide the list if we focused another option
    this.blurTimer = setTimeout(this.hideList, 0);
  },

  handleOptionFocus: function() {
    // see `handleOptionBlur`
    clearTimeout(this.blurTimer);
  },

  handleInputKeyUp: function(event) {
    if (
      this.state.menu.isEmpty ||
      // autocompleting while backspacing feels super weird, so let's not
      event.keyCode === 8 /*backspace*/ ||
      !this.props.autocomplete.match(/both|inline/)
    ) return;
    this.autocompleteInputValue();
  },

  /**
   * Autocompletes the input value with a matching label of the first
   * ComboboxOption in the list and selects only the fragment that has
   * been added, allowing the user to keep typing naturally.
  */
  autocompleteInputValue: function() {
    if (
      this.props.autocomplete == false ||
      this.props.children.length === 0
    ) return;
    var input = React.findDOMNode(this.refs.input);
    var inputValue = input.value;
    var firstChild = this.props.children.length ?
      this.props.children[0] :
      this.props.children;
    var label = getLabel(firstChild);
    var fragment = matchFragment(inputValue, label);
    if (!fragment)
      return;
    input.value = label;
    input.setSelectionRange(inputValue.length, label.length);
    this.setState({matchedAutocompleteOption: firstChild});
  },

  handleButtonClick: function() {
    this.state.isOpen ? this.hideList() : this.showList();
    this.focusInput();
  },

  showList: function() {
    if (this.props.autocomplete.match(/both|list/))
      this.setState({isOpen: true});
  },

  hideList: function() {
    this.setState({isOpen: false});
  },

  hideOnEscape: function() {
    this.hideList();
    this.focusInput();
  },

  focusInput: function() {
    React.findDOMNode(this.refs.input).focus();
  },

  selectInput: function() {
    React.findDOMNode(this.refs.input).select();
  },

  inputKeydownMap: {
    38: 'focusPrevious',
    40: 'focusNext',
    27: 'hideOnEscape',
    13: 'selectOnEnter'
  },

  optionKeydownMap: {
    38: 'focusPrevious',
    40: 'focusNext',
    13: 'selectOption',
    27: 'hideOnEscape'
  },

  handleKeydown: function(event) {
    var handlerName = this.inputKeydownMap[event.keyCode];
    if (!handlerName)
      return
    event.preventDefault();
    this.setState({usingKeyboard: true});
    this[handlerName].call(this);
  },

  handleOptionKeyDown: function(child, event) {
    var handlerName = this.optionKeydownMap[event.keyCode];
    if (!handlerName) {
      // if the user starts typing again while focused on an option, move focus
      // to the input, select so it wipes out any existing value
      this.selectInput();
      return;
    }
    event.preventDefault();
    this.setState({usingKeyboard: true});
    this[handlerName].call(this, child);
  },

  handleOptionMouseEnter: function(index) {
    if (this.state.usingKeyboard)
      this.setState({usingKeyboard: false});
    else
      this.focusOptionAtIndex(index);
  },

  selectOnEnter: function() {
    this.maybeSelectAutocompletedOption();
    React.findDOMNode(this.refs.input).select();
  },

  maybeSelectAutocompletedOption: function() {
    if (!this.state.matchedAutocompleteOption)
      return;
    this.selectOption(this.state.matchedAutocompleteOption, {focus: false});
  },

  selectOption: function(child, options) {
    options = options || {};
    this.setState({
      value: child.props.value,
      inputValue: getLabel(child),
      matchedAutocompleteOption: null
    }, function() {
      this.props.onSelect(child.props.value, child);
      this.hideList();
      if (options.focus !== false)
        this.selectInput();
    }.bind(this));
  },

  focusNext: function() {
    if (this.state.menu.isEmpty) return;
    var index = this.state.focusedIndex == null ?
      0 : this.state.focusedIndex + 1;
    this.focusOptionAtIndex(index);
  },

  focusPrevious: function() {
    if (this.state.menu.isEmpty) return;
    var last = this.props.children.length - 1;
    var index = this.state.focusedIndex == null ?
      last : this.state.focusedIndex - 1;
    this.focusOptionAtIndex(index);
  },

  focusSelectedOption: function() {
    var selectedIndex;
    React.Children.forEach(this.props.children, function(child, index) {
      if (child.props.value === this.state.value)
        selectedIndex = index;
    }.bind(this));
    this.showList();
    this.setState({
      focusedIndex: selectedIndex
    }, this.focusOption);
  },

  findInputValue: function(value) {
    value = value || this.props.value;
    // TODO: might not need this, we should know this in `makeMenu`
    var inputValue;
    React.Children.forEach(this.props.children, function(child) {
      if (child.props.value === value)
        inputValue = getLabel(child);
    });
    return inputValue || value;
  },

  focusOptionAtIndex: function(index) {
    if (!this.state.isOpen && this.state.value)
      return this.focusSelectedOption();
    this.showList();
    var length = this.props.children.length;
    if (index === -1)
      index = length - 1;
    else if (index === length)
      index = 0;
    this.setState({
      focusedIndex: index
    }, this.focusOption);
  },

  focusOption: function() {
    var index = this.state.focusedIndex;
    React.findDOMNode(this.refs.list).childNodes[index].focus();
  },

  render: function() {
    var appearance = this.getAppearance();
    var wrapperStyle = this.props.shrink ?
      { width: this.state.shrinkWidth + 'px' } :
      { };

    return (
      <div className={this.getClassName()}
           style={Object.assign(wrapperStyle, this.props.wrapperStyle)}>
        {this.props.shrink &&
          <span ref='sizer' style={{
            position: 'absolute',
            visibility: 'hidden',
            whiteSpace: 'nowrap',
            fontSize: '16px'
          }} />
        }
        {this.props.label &&
          <label className={appearance.label}
                style={Object.assign({}, this.props.labelStyle)}>
            {this.props.label}
          </label>
        }
        <input
          ref="input"
          className={appearance.input}
          defaultValue={this.props.value}
          value={this.state.inputValue}
          onChange={this.handleInputChange}
          onBlur={this.handleInputBlur}
          onFocus={this.handleInputFocus}
          onKeyDown={this.handleKeydown}
          onKeyUp={this.handleInputKeyUp}
          role="combobox"
          aria-activedescendant={this.state.menu.activedescendant}
          aria-autocomplete={this.props.autocomplete}
          aria-owns={this.state.listId}
          style={Object.assign({}, this.props.inputStyle)}
        />
        <div aria-hidden="true"
             className={appearance.button}
             ref="button"
             style={Object.assign({}, this.props.buttonStyle)}>
          <span className={appearance.caret}
                onClick={this.handleButtonClick} />
        </div>
        <ul
          id={this.state.listId}
          ref="list"
          className={appearance.list}
          aria-expanded={this.state.isOpen+''}
          role="listbox"
          style={Object.assign({}, this.props.listStyle)}
        >{this.state.menu.children}</ul>
      </div>
    );
  },

  updateWidth: function() {
    if (!this.props.shrink) {
      return;
    }

    var sizer = React.findDOMNode(this.refs.sizer);
    var input = React.findDOMNode(this.refs.input);
    var button = React.findDOMNode(this.refs.button);

    sizer.innerText = input.value;
    this.setState({
      shrinkWidth: sizer.offsetWidth + button.offsetWidth
    });
  }
});

function getLabel(component) {
  var hasLabel = component.props.label != null;
  return hasLabel ? component.props.label : component.props.children;
}

function matchFragment(userInput, firstChildLabel) {
  userInput = userInput.toLowerCase();
  firstChildLabel = firstChildLabel.toLowerCase();
  if (userInput === '' || userInput === firstChildLabel)
    return false;

  return (firstChildLabel.toLowerCase().indexOf(userInput.toLowerCase()) === 0);
}
