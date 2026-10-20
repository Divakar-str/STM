export class StateHistory {
  constructor(initialState, onChange) {
    this.undoStack = [];
    this.redoStack = [];
    this.currentState = structuredClone(initialState);
    this.onChange = onChange;
  }

  getState() {
    return structuredClone(this.currentState);
  }

  pushState(nextState, actionLabel = 'Edit') {
    this.undoStack.push({
      state: structuredClone(this.currentState),
      label: actionLabel
    });
    if (this.undoStack.length > 40) this.undoStack.shift();
    this.redoStack = [];
    this.currentState = structuredClone(nextState);
    this._notify();
  }

  undo() {
    if (!this.canUndo()) return null;
    const prev = this.undoStack.pop();
    this.redoStack.push({
      state: structuredClone(this.currentState),
      label: prev.label
    });
    this.currentState = structuredClone(prev.state);
    this._notify();
    return this.getState();
  }

  redo() {
    if (!this.canRedo()) return null;
    const next = this.redoStack.pop();
    this.undoStack.push({
      state: structuredClone(this.currentState),
      label: next.label
    });
    this.currentState = structuredClone(next.state);
    this._notify();
    return this.getState();
  }

  reset(initialState) {
    this.undoStack = [];
    this.redoStack = [];
    this.currentState = structuredClone(initialState);
    this._notify();
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  isDirty() {
    return this.undoStack.length > 0;
  }

  _notify() {
    if (typeof this.onChange === 'function') {
      this.onChange(this.getState(), {
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        isDirty: this.isDirty()
      });
    }
  }
}