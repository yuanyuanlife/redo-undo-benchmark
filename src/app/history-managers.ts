import { cloneDeep } from 'lodash-es';
import { klona } from 'klona';
import { produce } from 'immer';
import { fromJS, Collection, isImmutable, List, Map } from 'immutable';

export interface HistoryManager<T> {
  getCurrentState(): T;
  push(state: T): void;
  undo(): T | null;
  redo(): T | null;
  canUndo(): boolean;
  canRedo(): boolean;
}

// Lodash 实现
export class LodashHistoryManager<T> implements HistoryManager<T> {
  private states: T[] = [];
  private currentIndex = -1;

  constructor(initialState: T) {
    this.push(initialState);
  }

  getCurrentState(): T {
    return this.states[this.currentIndex];
  }

  push(state: T): void {
    this.states = this.states.slice(0, this.currentIndex + 1);
    this.states.push(cloneDeep(state));
    this.currentIndex++;
  }

  undo(): T | null {
    if (!this.canUndo()) return null;
    this.currentIndex--;
    return cloneDeep(this.states[this.currentIndex]);
  }

  redo(): T | null {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    return cloneDeep(this.states[this.currentIndex]);
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.states.length - 1;
  }
}

// JSON 实现
export class JsonHistoryManager<T> implements HistoryManager<T> {
  private states: string[] = [];
  private currentIndex = -1;

  constructor(initialState: T) {
    this.push(initialState);
  }

  getCurrentState(): T {
    return JSON.parse(this.states[this.currentIndex]);
  }

  push(state: T): void {
    this.states = this.states.slice(0, this.currentIndex + 1);
    this.states.push(JSON.stringify(state));
    this.currentIndex++;
  }

  undo(): T | null {
    if (!this.canUndo()) return null;
    this.currentIndex--;
    return JSON.parse(this.states[this.currentIndex]);
  }

  redo(): T | null {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    return JSON.parse(this.states[this.currentIndex]);
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.states.length - 1;
  }
}

// Klona 实现
export class KlonaHistoryManager<T> implements HistoryManager<T> {
  private states: T[] = [];
  private currentIndex = -1;

  constructor(initialState: T) {
    this.push(initialState);
  }

  getCurrentState(): T {
    return this.states[this.currentIndex];
  }

  push(state: T): void {
    this.states = this.states.slice(0, this.currentIndex + 1);
    this.states.push(klona(state));
    this.currentIndex++;
  }

  undo(): T | null {
    if (!this.canUndo()) return null;
    this.currentIndex--;
    return klona(this.states[this.currentIndex]);
  }

  redo(): T | null {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    return klona(this.states[this.currentIndex]);
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.states.length - 1;
  }
}

// Immer 实现
export class ImmerHistoryManager<T> implements HistoryManager<T> {
  private states: T[] = [];
  private currentIndex = -1;

  constructor(initialState: T) {
    this.push(initialState);
  }

  getCurrentState(): T {
    return this.states[this.currentIndex];
  }

  push(state: T): void {
    this.states = this.states.slice(0, this.currentIndex + 1);
    this.states.push(produce(state, draft => draft));
    this.currentIndex++;
  }

  undo(): T | null {
    if (!this.canUndo()) return null;
    this.currentIndex--;
    return this.states[this.currentIndex];
  }

  redo(): T | null {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    return this.states[this.currentIndex];
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.states.length - 1;
  }
}

// Immutable.js 实现
export class ImmutableHistoryManager<T> implements HistoryManager<T> {
  private states: List<any>[] = [];
  private currentIndex = -1;

  constructor(initialState: T) {
    this.push(fromJS(initialState));
  }

  getCurrentState(): T {
    return this.getCurrentImmutableState();
  }

  getCurrentImmutableState(): any {
    return this.states[this.currentIndex];
  }

  push(state: any): void {
    this.states = this.states.slice(0, this.currentIndex + 1);
    const immutableState = isImmutable(state) ? state : fromJS(state);
    this.states.push(immutableState);
    this.currentIndex++;
  }

  undo(): any {
    if (!this.canUndo()) return null;
    this.currentIndex--;
    return this.states[this.currentIndex];
  }

  redo(): any {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    return this.states[this.currentIndex];
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.states.length - 1;
  }
}

// 添加工具函数来深度冻结对象
function deepFreeze<T>(obj: T): Readonly<T> {
  // 获取对象的所有属性，包括不可枚举的属性
  const propNames = Object.getOwnPropertyNames(obj);
  
  // 在冻结对象之前，确保其属性也被冻结
  propNames.forEach(name => {
    const value = (obj as any)[name];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });
  
  return Object.freeze(obj);
}

// 原生不可变实现
export class NativeImmutableHistoryManager<T> implements HistoryManager<T> {
  private states: Readonly<T>[] = [];
  private currentIndex = -1;

  constructor(initialState: T) {
    this.push(initialState);
  }

  getCurrentState(): T {
    // 返回一个浅拷贝，这样外部修改不会影响内部状态
    return Array.isArray(this.states[this.currentIndex])
      ? [...this.states[this.currentIndex] as any]
      : { ...this.states[this.currentIndex] as any };
  }

  push(state: T): void {
    this.states = this.states.slice(0, this.currentIndex + 1);
    this.states.push(deepFreeze(
      Array.isArray(state) ? [...state] as unknown as T : { ...state }
    ));
    this.currentIndex++;
  }

  undo(): T | null {
    if (!this.canUndo()) return null;
    this.currentIndex--;
    return this.getCurrentState();
  }

  redo(): T | null {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    return this.getCurrentState();
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.states.length - 1;
  }
} 