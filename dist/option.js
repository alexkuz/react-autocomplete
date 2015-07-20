'use strict';

var React = require('react');

module.exports = React.createClass({
  displayName: 'exports',

  propTypes: {

    /**
     * The value that will be send to the `onSelect` handler of the
     * parent Combobox.
    */
    value: React.PropTypes.any.isRequired,

    /**
     * What value to put into the input element when this option is
     * selected, defaults to its children coerced to a string.
    */
    label: React.PropTypes.string
  },

  getDefaultProps: function getDefaultProps() {
    return {
      role: 'option',
      tabIndex: '-1',
      isSelected: false
    };
  },

  render: function render() {
    return React.createElement('li', this.props);
  }

});