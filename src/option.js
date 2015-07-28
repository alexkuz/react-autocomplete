var React = require('react');

module.exports = React.createClass({
  displayName: 'Option',

  propTypes: {

    /**
     * The value that will be send to the `onSelect` handler of the
     * parent Combobox.
    */
    value: React.PropTypes.any,

    /**
     * What value to put into the input element when this option is
     * selected, defaults to its children coerced to a string.
    */
    label: React.PropTypes.string,

    disabled: React.PropTypes.bool
  },

  getDefaultProps: function() {
    return {
      role: 'option',
      tabIndex: '-1',
      isSelected: false
    };
  },

  render: function() {
    return React.createElement('li', this.props);
  }

});
