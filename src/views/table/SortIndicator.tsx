import { SortDirection } from '../../types/SortDirection';

import Icon from '../Icon';

import * as React from 'react';

export interface IProps {
  direction: SortDirection;
  onSetDirection: (direction: SortDirection) => void;
}

function next(direction: SortDirection): SortDirection {
  switch (direction) {
    case 'none': return 'asc';
    case 'asc': return 'desc';
    default: return 'none';
  }
}

class SortIndicator extends React.Component<IProps, {}> {
  public render(): JSX.Element {
    const { direction } = this.props;
    return (
      <div style={{ display: 'inline' }} onClick={this.cycleDirection}>
        <Icon name={this.icon(direction)} />
      </div>
    );
  }

  private cycleDirection = () => {
    const { direction, onSetDirection } = this.props;

    onSetDirection(next(direction));
  }

  private icon(direction: SortDirection): string {
    switch (direction) {
      case 'none': return 'arrow-updown';
      case 'asc': return 'triangle-up';
      case 'desc': return 'triangle-down';
      default: return 'question';
    }
  }
}

export default SortIndicator;
