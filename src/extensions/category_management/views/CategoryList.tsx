import { showDialog } from '../../../actions/notifications';
import ActionDropdown from '../../../controls/ActionDropdown';
import Icon from '../../../controls/Icon';
import IconBar from '../../../controls/IconBar';
import { IconButton } from '../../../controls/TooltipControls';
import { IActionDefinition } from '../../../types/IActionDefinition';
import { IComponentContext } from '../../../types/IComponentContext';
import { IInput, IConditionResult } from '../../../types/IDialog';
import { DialogActions, DialogType, IDialogContent, IDialogResult } from '../../../types/IDialog';
import { IErrorOptions } from '../../../types/IExtensionContext';
import { IState } from '../../../types/IState';
import { ComponentEx, connect, translate } from '../../../util/ComponentEx';
import lazyRequire from '../../../util/lazyRequire';
import { showError } from '../../../util/message';
import { activeGameId } from '../../../util/selectors';

import { IMod } from '../../mod_management/types/IMod';

import { removeCategory, renameCategory, setCategory, setCategoryOrder } from '../actions/category';
import { ICategory, ICategoryDictionary } from '../types/ICategoryDictionary';
import { ICategoriesTree } from '../types/ITrees';
import { IValidationTest } from '../types/IValidationTest';
import createTreeDataObject from '../util/createTreeDataObject';

import * as Promise from 'bluebird';
import * as React from 'react';
import { FormControl } from 'react-bootstrap';
import * as SortableTreeT from 'react-sortable-tree';
import * as Redux from 'redux';
import { ThunkDispatch } from 'redux-thunk';


const tree = lazyRequire<typeof SortableTreeT>(() => require('react-sortable-tree'));

const nop = () => undefined;

interface ISearchMatch {
  node: ICategoriesTree;
  path: string[];
  treeIndex: number;
}

interface IActionProps {
  onShowError: (message: string, details: string | Error, options: IErrorOptions) => void;
  onSetCategory: (gameId: string, categoryId: string, category: ICategory) => void;
  onRemoveCategory: (gameId: string, categoryId: string) => void;
  onSetCategoryOrder: (gameId: string, categoryIds: string[]) => void;
  onRenameCategory: (activeGameId: string, categoryId: string, newCategory: {}) => void;
  onShowDialog: (type: DialogType, title: string, content: IDialogContent,
                 actions: DialogActions) => Promise<IDialogResult>;
}

interface IConnectedProps {
  gameMode: string;
  language: string;
  categories: ICategoryDictionary;
  mods: { [ modId: string ]: IMod };
}

interface IComponentState {
  treeData: ICategoriesTree[];
  expandedTreeData: ICategoriesTree[];
  expanded: string[];
  showEmpty: boolean;
  searchString: string;
  searchFocusIndex: number;
  searchFoundCount: number;
}

type IProps = IConnectedProps & IActionProps;

/**
 * displays the list of categories related for the current game.
 *
 */
class CategoryList extends ComponentEx<IProps, IComponentState> {
  public context: IComponentContext;
  private mButtons: IActionDefinition[];

  constructor(props) {
    super(props);
    this.initState({
      treeData: [],
      expandedTreeData: [],
      expanded: [],
      showEmpty: true,
      searchString: '',
      searchFocusIndex: 0,
      searchFoundCount: 0,
    });

    const { t } = props;

    this.mButtons = [
      {
        title: t('Expand All'),
        icon: 'expand-all',
        action: this.expandAll,
      }, {
        title: t('Collapse All'),
        icon: 'collapse-all',
        action: this.collapseAll,
      }, {
        title: t('Add Root Category'),
        icon: 'folder-add',
        action: this.addRootCategory,
      }, {
        title: t('Toggle empty categories'),
        icon: 'hide',
        action: this.toggleShowEmpty,
      },
    ];
  }

  public componentWillMount() {
    this.refreshTree(this.props);
  }

  public componentWillReceiveProps(newProps: IProps) {
    if (this.props.categories !== newProps.categories) {
      this.refreshTree(newProps);
    }
  }

  public render(): JSX.Element {
    const { t } = this.props;
    const { expandedTreeData, searchString, searchFocusIndex,
            searchFoundCount } = this.state;

    const Tree = tree.SortableTreeWithoutDndContext;
    return (
      <div className='categories-dialog'>
        <IconBar
          group='categories-icons'
          staticElements={this.mButtons}
          className='menubar categories-icons'
          t={t}
        />
        <div className='search-category-box'>
          <div style={{ display: 'inline-block', position: 'relative' }}>
            <FormControl
              id='search-category-input'
              type='text'
              placeholder={t('Search')}
              value={searchString || ''}
              onChange={this.startSearch}
            />
            <Icon className='search-icon' name='search' />
            <span className='search-position' >
              {t('{{ pos }} of {{ total }}', {
                replace: {
                  pos: searchFoundCount > 0 ? (searchFocusIndex + 1) : 0,
                  total: searchFoundCount || 0,
                },
              })}
            </span>
          </div>
          <IconButton
            id='btn-search-category-prev'
            className='btn-embed'
            icon='search-up'
            tooltip={t('Prev')}
            type='button'
            disabled={!searchFoundCount}
            onClick={this.selectPrevMatch}
          />
          <IconButton
            id='btn-search-category-next'
            className='btn-embed'
            icon='search-down'
            tooltip={t('Next')}
            type='button'
            disabled={!searchFoundCount}
            onClick={this.selectNextMatch}
          />
        </div>
        {((expandedTreeData || []).length > 0) ? (
          <Tree
            treeData={expandedTreeData}
            onChange={nop}
            onVisibilityToggle={this.toggleVisibility}
            onMoveNode={this.moveNode}
            style={{ height: '95%' }}
            searchMethod={this.searchMethod}
            searchQuery={searchString}
            searchFocusOffset={searchFocusIndex}
            searchFinishCallback={this.searchFinishCallback}
            getNodeKey={this.getNodeKey}
            generateNodeProps={this.generateNodeProps}
          />
        ) : null}
      </div>
    );
  }

  // tslint:disable-next-line:no-shadowed-variable
  private searchMethod = ({ node, path, treeIndex, searchQuery }:
    { node: ICategoriesTree, path: number[] | string[],
      treeIndex: number, searchQuery: any }) => {
    return (searchQuery.length > 0) &&
      (node.title.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1);
  }

  private updateExpandedTreeData = (categories: ICategoryDictionary) => {
    const { expanded, showEmpty, treeData } = this.nextState;
    this.nextState.expandedTreeData =
      this.applyExpand(treeData, showEmpty, new Set(expanded), categories);
  }

  private getNonEmptyCategories(treeData: ICategoriesTree[], ancestry: string[]): string[] {
    let res: string[] = [];
    treeData.forEach(category => {
      if (category.modCount > 0) {
        res.push(category.categoryId);
        res = res.concat(ancestry);
      }
      res = res.concat(this.getNonEmptyCategories(category.children,
                                                  [].concat(ancestry, [category.categoryId])));
    });
    return res;
  }

  private applyExpand(treeData: ICategoriesTree[], showEmpty: boolean,
                      expanded: Set<string>,
                      categories: ICategoryDictionary): ICategoriesTree[] {
    const filtered: Set<string> = new Set((showEmpty)
      ? Object.keys(categories)
      : this.getNonEmptyCategories(treeData, []));

    return treeData.map(obj => {
      if (!filtered.has(obj.categoryId)) {
        return undefined;
      }
      const copy: ICategoriesTree = { ...obj };
      copy.expanded = expanded.has(copy.categoryId);
      copy.children = this.applyExpand(copy.children, showEmpty, expanded, categories);
      return copy;
    })
    .filter(obj => obj !== undefined)
    ;
  }

  private toggleShowEmpty = () => {
    const {t, categories, mods, onShowError} = this.props;
    const { showEmpty } = this.state;

    try {
      const newTree = createTreeDataObject(t, categories, mods);
      this.nextState.treeData = newTree;
      this.nextState.showEmpty = !showEmpty;
      this.updateExpandedTreeData(categories);
    } catch (err) {
      onShowError('An error occurred hiding/showing the empty categories', err, { allowReport: false });
    }
  }

  private expandAll = () => {
    const { categories } = this.props;
    this.nextState.expanded = Object.keys(categories);
    this.updateExpandedTreeData(categories);
  }

  private collapseAll = () => {
    this.nextState.expanded = [];
    this.updateExpandedTreeData(this.props.categories);
  }

  private renameCategory = (categoryId: string) => {
    const {categories, gameMode, onShowDialog, onRenameCategory, onShowError} = this.props;

    const category = categories[categoryId];

    const inputs: IInput[] = [{ 
      id: 'newCategory', 
      value: category.name, 
      label: 'Category Name',
      validate: true,
    }];

    const validateInput = (action: string, content: IDialogContent): IConditionResult => {
      let errorTooltip: string = undefined;
      let isValid: boolean = true;

      if (action !== 'Rename') {
        return { result: true };
      }

      const validTest: IValidationTest = {
          isValid: () => content.input.find(inp => inp.value === '') === undefined,
          errorString: 'Input field cannot be empty'
      };

      if (validTest.isValid() === false) {
        isValid = false;
        errorTooltip = validTest.errorString;
      }

      return { 
        result: isValid, 
        errorString: errorTooltip 
      };
    }

    const dialogContent: IDialogContent = {
      input: inputs,
      validation: [validateInput]
    }

    onShowDialog('info', 'Rename Category', dialogContent,
    [ { label: 'Cancel' }, { label: 'Rename' } ])
    .then((result: IDialogResult) => {
      if ((result.action === 'Rename') && (result.input.newCategory !== undefined)) {
        onRenameCategory(gameMode, categoryId, result.input.newCategory);
      }
    });
  }

  private validateNewCategory = (action: string, content: IDialogContent): IConditionResult => {
    const { categories } = this.props;
    let errorTooltip: string = undefined;
      let isValid: boolean = true;

      if (action !== 'Add') {
        return { result: true };
      }

      const validationTests: IValidationTest[] = [
        {
          isValid: () => content.input.find(inp => inp.value === '') === undefined,
          errorString: 'Input field cannot be empty'
        },
        {
          isValid: () => Object.keys(categories).filter(id =>
            content.input.find(inp => inp.id === 'newCategoryId' && inp.value === id) !== undefined).length === 0,
          errorString: 'ID already used.'
        }
      ];

      validationTests.forEach(test => {
        if (test.isValid() === false) {
          isValid = false;
          errorTooltip = errorTooltip !== undefined 
            ? errorTooltip.concat('\n' + test.errorString)
            : test.errorString;
        }
      })

      return { 
        result: isValid, 
        errorString: errorTooltip 
      };
  }

  private addCategory = (parentId: string) => {
    const {categories, gameMode, onSetCategory, onShowDialog, onShowError} = this.props;
    const lastIndex = this.searchLastRootId(categories);

    if (Array.isArray(parentId)) {
      parentId = parentId[0];
    }

    const inputs: IInput[] = [{ 
      id: 'newCategory', 
      value: '', 
      label: 'Category Name',
      validate: true,
    },{
      id: 'newCategoryId',
      value: lastIndex.toString(),
      label: 'Category ID',
      validate: true,
    }];
  
    const dialogContent: IDialogContent = {
      input: inputs,
      validation: [this.validateNewCategory]
    }

    onShowDialog('question', 'Add Child Category', dialogContent,
    [
      { label: 'Cancel' }, { label: 'Add' }
    ])
    .then((result: IDialogResult) => {
      if (result.action === 'Add') {
        onSetCategory(gameMode, result.input.newCategoryId, {
          name: result.input.newCategory,
          parentCategory: parentId,
          order: 0,
        });
      }
    });
  }

  private addRootCategory = () => {
    const {categories, gameMode, onSetCategory, onShowDialog} = this.props;
    let addCategory = true;
    const lastIndex = this.searchLastRootId(categories);

    const inputs: IInput[] = [{
      id: 'newCategory', 
      value: '', 
      label: 'Category Name',
      validate: true,
    },{
      id: 'newCategoryId',
      value: lastIndex.toString(),
      label: 'Category ID',
      validate: true,
    }];
  
    const dialogContent: IDialogContent = {
      input: inputs,
      validation: [this.validateNewCategory]
    }

    onShowDialog('question', 'Add new Root Category', dialogContent, [{ label: 'Cancel' }, { label: 'Add', default: true }])
      .then((result: IDialogResult) => {
        addCategory = result.action === 'Add';
        if (addCategory) {
          onSetCategory(gameMode, result.input.newCategoryId, {
            name: result.input.newCategory,
            parentCategory: undefined,
            order: 0,
          });
        }
      });
  }

  private searchLastRootId(categories: ICategoryDictionary) {
    let maxId = 0;
    if (categories !== undefined) {
    Object.keys(categories).filter((id: string) => {
      if (parseInt(id, 10) > maxId) {
        maxId = parseInt(id, 10);
      }
    });
    }
    return maxId + 1;
  }

  private selectPrevMatch = () => {
    const { searchFocusIndex, searchFoundCount } = this.state;

    this.nextState.searchFocusIndex = (searchFoundCount + searchFocusIndex - 1) % searchFoundCount;
  }

  private selectNextMatch = () => {
    const { searchFocusIndex, searchFoundCount } = this.state;

    this.nextState.searchFocusIndex = (searchFocusIndex + 1) % searchFoundCount;
  }

  private refreshTree(props: IProps) {
    const { t } = this.props;
    const { categories, mods } = props;

    if (categories !== undefined) {
      if (Object.keys(categories).length !== 0) {
        this.nextState.treeData = createTreeDataObject(t, categories, mods);
        this.updateExpandedTreeData(categories);
      }
    }
  }

  private startSearch = (event) => {
    this.nextState.searchString = event.target.value;
  }

  private searchFinishCallback = (matches: ISearchMatch[]) => {
    const { searchFocusIndex } = this.state;
    // important: Avoid updating the state if the values haven't changed because
    //  changing the state causes a re-render and a re-render causes the tree to search
    //  again (why?) which causes a new finish callback -> infinite loop
    if (this.state.searchFoundCount !== matches.length) {
      this.nextState.searchFoundCount = matches.length;
    }
    const newFocusIndex = matches.length > 0 ? searchFocusIndex % matches.length : 0;
    if (this.state.searchFocusIndex !== newFocusIndex) {
      this.nextState.searchFocusIndex = newFocusIndex;
    }
  }

  private removeCategory = (id: string) => {
    const { categories, gameMode, onRemoveCategory } = this.props;
    Object.keys(categories)
      .filter(iterId => categories[iterId].parentCategory === id)
      .forEach(iterId => this.removeCategory(iterId));
    onRemoveCategory(gameMode, id);
  }

  private generateNodeProps = (rowInfo: SortableTreeT.ExtendedNodeData) => {
    const {t} = this.props;
    const actions: IActionDefinition[] = [
      {
        icon: 'edit',
        title: t('Rename'),
        action: this.renameCategory,
      },
      {
        icon: 'folder-add',
        title: t('Add Child'),
        action: this.addCategory,
      },
      {
        icon: 'remove',
        title: t('Remove'),
        action: this.removeCategory,
      },
    ];
    return {
      buttons: [
        (
          <ActionDropdown
            className='category-buttons'
            group='category-icons'
            staticElements={actions}
            instanceId={rowInfo.node.categoryId}
          />
        ),
      ],
    };
  }

  private getNodeKey = (args: { node: ICategoriesTree, treeIndex: number }) => {
    return args.node.categoryId;
  }

  private toggleVisibility =
    (args: {treeData: ICategoriesTree[], node: ICategoriesTree, expanded: boolean}) => {
    if (args.expanded) {
      this.nextState.expanded.push(args.node.categoryId);
    } else {
      this.nextState.expanded.splice(this.nextState.expanded.indexOf(args.node.categoryId));
    }

    this.updateExpandedTreeData(this.props.categories);
  }

  private moveNode =
    (args: { treeData: SortableTreeT.TreeItem[], node: SortableTreeT.TreeItem,
             treeIndex: number, path: string[] | number[] }): void => {
    const { gameMode, onSetCategory, onSetCategoryOrder } = this.props;
    if (args.path[args.path.length - 2] !== args.node.parentId) {
      onSetCategory(gameMode, args.node.categoryId, {
        name: args.node.title,
        order: args.node.order,
        parentCategory: (args.path as string[])[args.path.length - 2],
      });
    } else {
      const newOrder = (base: ICategoriesTree[]): string[] => {
        return [].concat(...base.map(node =>
          [node.categoryId, ...newOrder(node.children)]));
      };
      onSetCategoryOrder(gameMode, newOrder(args.treeData as ICategoriesTree[]));
    }
  }
}

const emptyObj = {};

function mapStateToProps(state: IState): IConnectedProps {
  const gameMode = activeGameId(state);
  return {
    gameMode,
    language: state.settings.interface.language,
    categories: state.persistent.categories[gameMode] || emptyObj,
    mods: state.persistent.mods[gameMode],
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<IState, null, Redux.Action>): IActionProps {
  return {
    onRenameCategory: (gameId: string, categoryId: string, newCategory: string) =>
      dispatch(renameCategory(gameId, categoryId, newCategory)),
    onSetCategory: (gameId: string, categoryId: string, category: ICategory) =>
      dispatch(setCategory(gameId, categoryId, category)),
    onRemoveCategory: (gameId: string, categoryId: string) =>
      dispatch(removeCategory(gameId, categoryId)),
    onSetCategoryOrder: (gameId: string, categoryIds: string[]) =>
      dispatch(setCategoryOrder(gameId, categoryIds)),
    onShowError: (message: string, details: string | Error, options: IErrorOptions) =>
      showError(dispatch, message, details, options),
    onShowDialog: (type, title, content, actions) =>
      dispatch(showDialog(type, title, content, actions)),
  };
}

export default
  translate(['common'], { wait: false })(
    connect(mapStateToProps, mapDispatchToProps)(
      CategoryList))as React.ComponentClass<{}>;
