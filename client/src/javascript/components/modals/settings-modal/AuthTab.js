import classnames from 'classnames';
import {CSSTransition, TransitionGroup} from 'react-transition-group';
import {FormattedMessage, injectIntl} from 'react-intl';
import React from 'react';

import {Button, Checkbox, Form, FormError, FormRowItem, FormRow, LoadingRing, Textbox} from '../../../ui';
import AuthActions from '../../../actions/AuthActions';
import AuthStore from '../../../stores/AuthStore';
import Close from '../../icons/Close';
import connectStores from '../../../util/connectStores';
import EventTypes from '../../../constants/EventTypes';
import ModalFormSectionHeader from '../ModalFormSectionHeader';
import RtorrentConnectionTypeSelection from '../../general/RtorrentConnectionTypeSelection';
import SettingsTab from './SettingsTab';

class AuthTab extends SettingsTab {
  state = {
    addUserError: null,
    hasFetchedUserList: false,
    isAddingUser: false,
  };

  formData = {};

  formRef = null;

  componentDidMount() {
    if (!this.props.isAdmin) return;

    AuthActions.fetchUsers().then(() => {
      this.setState({hasFetchedUserList: true});
    });
  }

  getUserList() {
    const userList = this.props.users.sort((a, b) => a.username.localeCompare(b.username));

    const currentUsername = AuthStore.getCurrentUsername();

    return userList.map((user) => {
      const isCurrentUser = user.username === currentUsername;
      let badge = null;
      let removeIcon = null;

      if (!isCurrentUser) {
        removeIcon = (
          <span
            className="interactive-list__icon interactive-list__icon--action interactive-list__icon--action--warning"
            onClick={this.handleDeleteUserClick.bind(this, user.username)}>
            <Close />
          </span>
        );
      } else {
        badge = (
          <span className="interactive-list__label__tag tag">
            <FormattedMessage id="auth.current.user" />
          </span>
        );
      }

      const classes = classnames('interactive-list__item', {
        'interactive-list__item--disabled': isCurrentUser,
      });

      return (
        <li className={classes} key={user.username}>
          <span className="interactive-list__label">
            <div className="interactive-list__label__text">{user.username}</div>
            {badge}
          </span>
          {removeIcon}
        </li>
      );
    });
  }

  handleDeleteUserClick(username) {
    AuthActions.deleteUser(username).then(AuthActions.fetchUsers);
  }

  handleFormChange = ({formData}) => {
    this.formData = formData;
  };

  handleFormSubmit = () => {
    if (this.formData.username === '') {
      this.setState({
        addUserError: this.props.intl.formatMessage({
          id: 'auth.error.username.empty',
        }),
      });
    } else {
      this.setState({isAddingUser: true});

      AuthActions.createUser({
        username: this.formData.username,
        password: this.formData.password,
        host: this.formData.rtorrentHost,
        port: this.formData.rtorrentPort,
        socketPath: this.formData.rtorrentSocketPath,
        isAdmin: this.formData.isAdmin === true,
      })
        .then(AuthActions.fetchUsers, (error) => {
          this.setState({addUserError: error.response.data.message, isAddingUser: false});
        })
        .then(() => {
          this.formRef.resetForm();
          this.setState({addUserError: null, isAddingUser: false});
        });
    }
  };

  render() {
    if (!this.props.isAdmin) {
      return (
        <Form>
          <ModalFormSectionHeader>
            <FormattedMessage id="auth.user.accounts" />
          </ModalFormSectionHeader>
          <FormRow>
            <FormError>
              <FormattedMessage id="auth.message.not.admin" />
            </FormError>
          </FormRow>
        </Form>
      );
    }

    const isLoading = !this.state.hasFetchedUserList && this.props.users.length === 0;
    const interactiveListClasses = classnames('interactive-list', {
      'interactive-list--loading': isLoading,
    });
    let errorElement = null;
    let loadingIndicator = null;

    if (this.state.addUserError) {
      errorElement = (
        <FormRow>
          <FormError>{this.state.addUserError}</FormError>
        </FormRow>
      );
    }

    if (isLoading) {
      loadingIndicator = (
        <CSSTransition classNames="interactive-list__loading-indicator" timeout={{enter: 250, exit: 250}}>
          <div className="interactive-list__loading-indicator" key="loading-indicator">
            <LoadingRing />
          </div>
        </CSSTransition>
      );
    }

    return (
      <Form
        onChange={this.handleFormChange}
        onSubmit={this.handleFormSubmit}
        ref={(ref) => {
          this.formRef = ref;
        }}>
        <ModalFormSectionHeader>
          <FormattedMessage id="auth.user.accounts" />
        </ModalFormSectionHeader>
        <FormRow>
          <FormRowItem>
            <ul className={interactiveListClasses}>
              <TransitionGroup>{loadingIndicator}</TransitionGroup>
              {this.getUserList()}
            </ul>
          </FormRowItem>
        </FormRow>
        <ModalFormSectionHeader>
          <FormattedMessage id="auth.add.user" />
        </ModalFormSectionHeader>
        {errorElement}
        <FormRow>
          <Textbox
            id="username"
            label={<FormattedMessage id="auth.username" />}
            placeholder={this.props.intl.formatMessage({
              id: 'auth.username',
            })}
          />
          <Textbox
            id="password"
            label={<FormattedMessage id="auth.password" />}
            placeholder={this.props.intl.formatMessage({
              id: 'auth.password',
            })}
          />
          <Checkbox grow={false} id="isAdmin" labelOffset matchTextboxHeight>
            <FormattedMessage id="auth.admin" />
          </Checkbox>
        </FormRow>
        <RtorrentConnectionTypeSelection />
        <FormRow justify="end">
          <Button isLoading={this.state.isAddingUser} priority="primary" type="submit" width="auto">
            <FormattedMessage id="button.add" />
          </Button>
        </FormRow>
      </Form>
    );
  }
}

const ConnectedAuthTab = connectStores(injectIntl(AuthTab), () => {
  return [
    {
      store: AuthStore,
      event: EventTypes.AUTH_LIST_USERS_SUCCESS,
      getValue: ({store}) => {
        return {
          users: store.getUsers(),
          isAdmin: store.isAdmin(),
        };
      },
    },
  ];
});

export default ConnectedAuthTab;
