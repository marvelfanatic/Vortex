import { setdefault } from './util';

export class StateError extends Error {
  private mAction: Redux.Action;
  constructor(action: Redux.Action, message: string) {
    super(message);
    this.name = this.constructor.name;
    this.mAction = action;
  }
}

export type SanityCheck = (state: any, action: Redux.Action) => string;

const sanityChecks: { [type: string]: SanityCheck[] } = {};

export function reduxSanity(callback: (err: StateError) => void) {
  return (store: Redux.Store<any>) =>
    <S>(next: Redux.Dispatch<S>) =>
      <A extends Redux.Action>(action: A): A => {
        let invalid: boolean = false;
        (sanityChecks[action.type as string] || []).forEach(check => {
          const res = check(store.getState(), action);
          if (res !== undefined) {
            callback(new StateError(action, res));
            invalid = true;
          }
        });
        if (invalid) {
          return action;
        }
        return next(action);
      };
}

export function registerSanityCheck(type: string, check: SanityCheck) {
  setdefault(sanityChecks, type, []).push(check);
}