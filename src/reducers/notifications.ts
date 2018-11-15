import * as actions from '../actions/notifications';
import { IReducerSpec } from '../types/IExtensionContext';

import { pushSafe, removeValueIf, setSafe, getSafe } from '../util/storeHelper';

import update from 'immutability-helper';
import { generate as shortid } from 'shortid';
import { IDisabledAction } from '../actions/notifications';

/**
 * reducer for changes to notifications
 */
export const notificationsReducer: IReducerSpec = {
  reducers: {
    [actions.startNotification as any]: (state, payload) => {
      let temp = state;
      const statePath = payload.type === 'global' ? ['global_notifications'] : ['notifications'];
      if (payload.id === undefined) {
        payload.id = shortid();
      } else {
        temp = removeValueIf(state, statePath, (noti) => noti.id === payload.id);
      }
      return pushSafe(temp, statePath, payload);
    },
    [actions.updateNotification as any]: (state, payload) => {
      const idx = state.notifications.findIndex(noti => noti.id === payload.id);
      if (idx === -1) {
        return state;
      }

      return setSafe(
        setSafe(state, ['notifications', idx, 'progress'],  payload.progress),
                       ['notifications', idx, 'message'], payload.message);
    },
    [actions.stopNotification as any]: (state, payload) => {
      return removeValueIf(removeValueIf(state, ['notifications'], (noti) => noti.id === payload),
        ['global_notifications'], (noti) => noti.id === payload);
    },
    [actions.addDialog as any]: (state, payload) => {
      return update(state, { dialogs: { $push: [payload] } });
    },
    [actions.dismissDialog as any]: (state, payload) => {
      return removeValueIf(state, ['dialogs'], (dialog) => dialog.id === payload);
    },
    [actions.setActionEnabled as any]: (state, payload) => {
      const {id, action, isEnabled, tooltip} = payload;
      const dialogId = state.dialogs.findIndex(noti => noti.id === id);
      if (dialogId === -1) {
        return state;
      }

      const statePath = ['dialogs', dialogId, 'disabled'];
      const disabled: IDisabledAction[] = getSafe(state, statePath, undefined);

      if (isEnabled) {
        const temp: IDisabledAction[] = disabled !== undefined ? [...disabled] : [];
        let ind = temp.findIndex(dis => dis.action === action) 
        ind !== -1
          ? temp[ind] = {action, tooltip}
          : temp.push({action, tooltip});
        return setSafe(state, statePath, temp)
      } else {
        return removeValueIf(state, statePath, dis => dis.action === action);
      }
    },
  },
  defaults: {
    notifications: [],
    global_notifications: [],
    dialogs: [],
  },
};
