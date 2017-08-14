import Icon from './Icon';

import classNames = require('classnames');
import * as _ from 'lodash';
import * as PropTypes from 'prop-types';
import * as React from 'react';

export interface IFormFeedbackProps {
  pending?: boolean;
  className?: string;
}

class FormFeedback extends React.Component<IFormFeedbackProps, {}> {
  public static contextTypes: React.ValidationMap<any> = {
    $bs_formGroup: PropTypes.object,
  };

  public static defaultProps = {
    bsRole: 'feedback',
  };

  public render(): JSX.Element {
    const formGroup = this.context.$bs_formGroup;
    const { className } = this.props;

    const classes = ['form-control-feedback', 'feedback-awesome'];

    const { pending } = this.props;

    const elementProps = _.omit(this.props, [ 'pending', 'bsRole' ]);

    const icon: JSX.Element = this.icon(formGroup && formGroup.validationState, pending);
    if (icon === undefined) {
      return null;
    } else {
      return (
        <div {...elementProps} className={classNames(className, classes)}>
          {icon}
        </div>
      );
    }
  }

  private icon(state: string, pending: boolean): JSX.Element {
    const style = { verticalAlign: 'baseline' };
    if (pending) {
      return <Icon name='spinner' pulse style={style} />;
    }
    switch (state) {
      case 'success': return <Icon name='check' style={style} />;
      case 'warning': return <Icon name='triangle-alert' style={style} />;
      case 'error': return <Icon name='cross' style={style} />;
      default: return undefined;
    }
  }
}

export default FormFeedback;
