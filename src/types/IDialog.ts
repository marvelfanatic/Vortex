export type DialogType =
  'success' | 'info' | 'error' | 'question';

export interface IConditionResult {
  result: boolean,
  errorString?: string,
}

// Disabled actions are stored as kvp within the store.
//  key: action, value: tooltip.
export interface IDisabledAction {
  action: string,
  tooltip: string,
}

export type Condition = (action: string, dialogState: IDialogContent) => IConditionResult;

export interface IDialogAction {
  label: string;
  default?: boolean;
  action?: (label: string) => void;
}

export type DialogActions = IDialogAction[];

export interface IDialog {
  id: string;
  type: DialogType;
  title: string;
  content: IDialogContent;
  defaultAction: string;
  actions: string[];
  disabled: IDisabledAction[];
}

export interface IValidate {
  validate?: boolean;
}

export interface ICheckbox extends IValidate {
  id: string;
  text: string;
  value: boolean;
}

export interface IInput extends IValidate {
  id: string;
  type?: 'text' | 'password' | 'number' | 'date' | 'time' | 'email' | 'url';
  value?: string;
  label?: string;
  placeholder?: string;
}

export interface ILink {
  label: string;
  id?: string;
  action?: (dismiss: () => void, id: string) => void;
}

export interface IDialogContent {
  htmlFile?: string;
  /**
   * displays a message as html.
   * NOTE: this will be inserted directy
   * into the dom so it must never be html from
   * an external source!
   *
   * @type {string}
   * @memberOf IDialogContent
   */
  htmlText?: string;
  /**
   * regular text. This will be wrapped, not selectable for the user,
   * not scrollable and not maintain any kind of predefined linebreaks.
   */
  text?: string;
  /**
   * regular text. This will be put into a scrollable, selectable textbox.
   * Whether the text wraps or not is determined by options.wrap
   */
  message?: string;
  bbcode?: string;
  checkboxes?: ICheckbox[];
  choices?: ICheckbox[];
  input?: IInput[];
  /**
   * list of clickable entries that don't (necessarily) cause the dialog to close
   */
  links?: ILink[];
  parameters?: any;
  options?: {
    translated?: boolean;
    wrap?: boolean;
    hideMessage?: boolean;
  };

  /** 
   * An array of conditions that allow us to validate this dialog's
   *  content; we then decide whether to enable/disable certain actions
   *  depending on the condition results.
   */
  validation?: Condition[];
}

export interface IDialogResult {
  action: string;
  input: any;
}
