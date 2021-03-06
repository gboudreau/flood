import classnames from 'classnames';
import {injectIntl} from 'react-intl';
import React from 'react';

import Badge from '../general/Badge';

const METHODS_TO_BIND = ['handleClick'];

class SidebarFilter extends React.Component {
  constructor() {
    super();

    METHODS_TO_BIND.forEach((method) => {
      this[method] = this[method].bind(this);
    });
  }

  handleClick() {
    this.props.handleClick(this.props.slug);
  }

  render() {
    const classNames = classnames('sidebar-filter__item', {
      'is-active': this.props.isActive,
    });
    let {name} = this.props;

    if (this.props.name === 'all') {
      name = this.props.intl.formatMessage({
        id: 'filter.all',
      });
    } else if (this.props.name === 'untagged') {
      name = this.props.intl.formatMessage({
        id: 'filter.untagged',
      });
    }

    if (this.props.slug === 'checking' || this.props.slug === 'error') {
      if (this.props.count === 0) {
        return null;
      }
    }

    return (
      <li className={classNames} onClick={this.handleClick}>
        {this.props.icon}
        {name}
        <Badge>{this.props.count}</Badge>
      </li>
    );
  }
}

export default injectIntl(SidebarFilter);
