import _ from 'lodash';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';

const ARROW_SIZE = 7;
const METHODS_TO_BIND = [
  'dismissTooltip',
  'getIdealLocation',
  'handleMouseEnter',
  'handleMouseLeave',
  'handleTooltipMouseEnter',
  'handleTooltipMouseLeave',
  'isOpen',
  'triggerClose',
];

const TOOLTIP_PROPS = [
  'align',
  'anchor',
  'children',
  'className',
  'contentClassName',
  'content',
  'elementTag',
  'interactive',
  'maxWidth',
  'onMouseLeave',
  'offset',
  'onClose',
  'onOpen',
  'position',
  'scrollContainer',
  'stayOpen',
  'suppress',
  'width',
  'wrapperClassName',
  'wrapText',
];

class Tooltip extends React.Component {
  static propTypes = {
    align: PropTypes.oneOf(['start', 'center', 'end']),
    anchor: PropTypes.oneOf(['start', 'center', 'end']),
    children: PropTypes.node,
    className: PropTypes.string,
    contentClassName: PropTypes.string,
    content: PropTypes.node.isRequired,
    elementTag: PropTypes.string,
    interactive: PropTypes.bool,
    maxWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    onMouseLeave: PropTypes.func,
    offset: PropTypes.number,
    onClose: PropTypes.func,
    onOpen: PropTypes.func,
    position: PropTypes.oneOf(['top', 'bottom', 'right', 'left']),
    scrollContainer: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    stayOpen: PropTypes.bool,
    suppress: PropTypes.bool,
    width: PropTypes.number,
    wrapperClassName: PropTypes.string,
    wrapText: PropTypes.bool,
  };

  static defaultProps = {
    align: 'center',
    anchor: 'center',
    className: 'tooltip',
    contentClassName: 'tooltip__content',
    elementTag: 'div',
    interactive: false,
    offset: 0,
    position: 'top',
    scrollContainer: window,
    stayOpen: false,
    suppress: false,
    wrapperClassName: 'tooltip__wrapper',
    wrapText: false,
  };

  constructor() {
    super();

    METHODS_TO_BIND.forEach((method) => {
      this[method] = this[method].bind(this);
    });

    this.container = null;
    this.state = {isOpen: false, wasTriggeredClose: false};
  }

  componentWillUnmount() {
    this.removeScrollListener();
  }

  handleMouseEnter(options = {}) {
    const {props} = this;

    if (props.suppress && !options.forceOpen) {
      return;
    }

    const {anchor, position, coordinates} = this.getIdealLocation(props.anchor, props.position);

    this.setState({
      anchor,
      isOpen: true,
      position,
      coordinates,
      wasTriggeredClose: false,
    });
    this.addScrollListener();

    if (props.onOpen) {
      props.onOpen();
    }
  }

  handleMouseLeave() {
    this.dismissTooltip();

    if (this.props.onMouseLeave) {
      this.props.onMouseLeave();
    }
  }

  handleTooltipMouseEnter() {
    if (this.props.interactive && !this.state.wasTriggeredClose) {
      this.setState({isOpen: true});
      this.addScrollListener();
    }
  }

  handleTooltipMouseLeave() {
    this.dismissTooltip();
  }

  addScrollListener() {
    if (!this.container) {
      this.container = this.props.scrollContainer;
    }

    this.container.addEventListener('scroll', this.dismissTooltip);
  }

  dismissTooltip(options = {}) {
    if ((!this.props.stayOpen || options.forceClose) && this.state.isOpen) {
      this.setState({isOpen: false});
      this.removeScrollListener();

      if (this.props.onClose) {
        this.props.onClose();
      }
    }
  }

  getAnchor(isVertical, anchor, clearance, tooltipWidth, tooltipHeight) {
    if (isVertical) {
      return this.transformAnchor(anchor, clearance.left, clearance.right, tooltipWidth, clearance.boundingRect.width);
    }

    return this.transformAnchor(anchor, clearance.top, clearance.bottom, tooltipHeight, clearance.boundingRect.height);
  }

  getCoordinates(position, clearance, tooltipWidth, tooltipHeight) {
    const {align, offset} = this.props;
    let left = null;
    let top = null;

    if (position === 'top' || position === 'bottom') {
      if (align === 'center') {
        left = clearance.boundingRect.left + clearance.boundingRect.width / 2;
      } else if (align === 'start') {
        // eslint-disable-next-line prefer-destructuring
        left = clearance.boundingRect.left;
      } else if (align === 'end') {
        left = clearance.boundingRect.left + clearance.boundingRect.width - tooltipWidth;
      }
    } else {
      top = clearance.boundingRect.top + clearance.boundingRect.height / 2;
    }

    if (position === 'top') {
      top = clearance.boundingRect.top - tooltipHeight + ARROW_SIZE + offset;
    } else if (position === 'right') {
      left = clearance.boundingRect.right + offset;
    } else if (position === 'bottom') {
      top = clearance.boundingRect.bottom + offset;
    } else {
      left = clearance.boundingRect.left - tooltipWidth + ARROW_SIZE + offset;
    }

    return {left, top};
  }

  isVertical(position) {
    return position !== 'left' && position !== 'right';
  }

  getPosition(position, clearance, tooltipWidth, tooltipHeight) {
    // Change the position if the tooltip will be rendered off the screen.
    if (position === 'left' && clearance.left < tooltipWidth) {
      position = 'right';
    } else if (position === 'right' && clearance.right < tooltipWidth) {
      position = 'left';
    }

    if (position === 'top' && clearance.top < tooltipHeight) {
      position = 'bottom';
    } else if (position === 'bottom' && clearance.bottom < tooltipHeight && clearance.top > clearance.bottom) {
      position = 'top';
    }

    return position;
  }

  getIdealLocation(anchor, position) {
    const clearance = this.getNodeClearance(this.triggerNode);
    const isVertical = this.isVertical(position);
    const tooltipRect = this.tooltipNode.getBoundingClientRect();
    const tooltipHeight = tooltipRect.height + ARROW_SIZE;
    const tooltipWidth = tooltipRect.width + ARROW_SIZE;

    anchor = this.getAnchor(isVertical, anchor, clearance, tooltipWidth, tooltipHeight);
    position = this.getPosition(position, clearance, tooltipWidth, tooltipHeight);

    const coordinates = this.getCoordinates(position, clearance, tooltipWidth, tooltipHeight);

    return {anchor, position, coordinates};
  }

  getNodeClearance(domNode) {
    const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const boundingRect = domNode.getBoundingClientRect();

    return {
      bottom: viewportHeight - boundingRect.bottom,
      left: boundingRect.left,
      right: viewportWidth - boundingRect.right,
      top: boundingRect.top,
      boundingRect,
    };
  }

  isOpen() {
    return this.state.isOpen;
  }

  removeScrollListener() {
    if (this.container) {
      this.container.removeEventListener('scroll', this.dismissTooltip);
    }
  }

  triggerClose() {
    this.setState({wasTriggeredClose: true});
    this.dismissTooltip({forceClose: true});
  }

  triggerOpen() {
    this.handleMouseEnter({forceOpen: true});
  }

  transformAnchor(anchor, clearanceStart, clearanceEnd, tooltipDimension, triggerDimension) {
    // Change the provided anchor based on the clearance available.
    if (anchor === 'start' && clearanceEnd < tooltipDimension) {
      return 'end';
    }

    if (anchor === 'end' && clearanceStart < tooltipDimension) {
      return 'start';
    }

    if (anchor === 'center') {
      const tooltipOverflow = (tooltipDimension - triggerDimension) / 2;

      if (clearanceStart < tooltipOverflow) {
        return 'start';
      }

      if (clearanceEnd < tooltipOverflow) {
        return 'end';
      }
    }

    return anchor;
  }

  render() {
    const {props, state} = this;
    let tooltipStyle = {};

    const {align} = props;
    // Get the anchor and position from state if possible. If not, get it from
    // the props.
    const anchor = state.anchor || props.anchor;
    const position = state.position || props.position;
    // Pass along any props that aren't specific to the Tooltip.
    const elementProps = _.omit(props, TOOLTIP_PROPS);

    const tooltipClasses = classnames(
      props.className,
      `tooltip--anchor--${anchor}`,
      `tooltip--position--${position}`,
      `tooltip--align--${align}`,
      {
        'is-interactive': props.interactive,
        'is-open': state.isOpen,
        'tooltip--no-wrap': !props.wrapText,
      },
    );

    if (state.coordinates) {
      tooltipStyle = {
        left: state.coordinates.left,
        top: state.coordinates.top,
      };
    }

    if (props.width) {
      tooltipStyle.width = props.width;
    }

    if (props.maxWidth) {
      tooltipStyle.maxWidth = props.maxWidth;
    }

    return (
      <props.elementTag
        className={props.wrapperClassName}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
        {...elementProps}
        ref={(ref) => {
          this.triggerNode = ref;
        }}>
        {props.children}
        {ReactDOM.createPortal(
          <div
            className={tooltipClasses}
            ref={(ref) => {
              this.tooltipNode = ref;
            }}
            style={tooltipStyle}
            onMouseEnter={this.handleTooltipMouseEnter}
            onMouseLeave={this.handleTooltipMouseLeave}>
            <div className={props.contentClassName}>{props.content}</div>
          </div>,
          document.getElementById('app'),
        )}
      </props.elementTag>
    );
  }
}

export default Tooltip;
