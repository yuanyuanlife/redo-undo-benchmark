import { Injectable } from '@angular/core';
import { generateLargeData } from './data-generator';
import {
  HistoryManager,
  LodashHistoryManager,
  JsonHistoryManager,
  KlonaHistoryManager,
  ImmerHistoryManager,
  ImmutableHistoryManager,
  NativeImmutableHistoryManager
} from './history-managers';
import { fromJS, List, Map } from 'immutable';

@Injectable({
  providedIn: 'root'
})
export class BenchmarkService {
  private data = generateLargeData(100);

  async runBenchmarks() {
    const results: Record<string, Record<string, number>> = {
      'Add': {},
      'Delete': {},
      'DeepModify': {}
    };

    const implementations: Array<[string, () => HistoryManager<any>]> = [
      ['Lodash', () => new LodashHistoryManager(this.data)],
      ['JSON', () => new JsonHistoryManager(this.data)],
      ['Klona', () => new KlonaHistoryManager(this.data)],
      ['Immer', () => new ImmerHistoryManager(this.data)],
      ['Immutable', () => new ImmutableHistoryManager(this.data)],
      ['NativeImmutable', () => new NativeImmutableHistoryManager(this.data)]
    ];

    for (const [name, createManager] of implementations) {
      console.log(`\n测试 ${name}:`);
      try {
        // 为每个实现创建新的管理器
        const manager = (createManager as () => HistoryManager<any>)();
        
        // 运行测试
        results['Add'][name] = await this.benchmarkAdd({ [name]: manager });
        
        // 清理内存
        await this.cleanupMemory();
        
        results['Delete'][name] = await this.benchmarkDelete({ [name]: manager });
        await this.cleanupMemory();
        
        results['DeepModify'][name] = await this.benchmarkDeepModify({ [name]: manager });
        await this.cleanupMemory();
        
      } catch (error) {
        console.error(`${name} 测试失败:`, error);
        results['Add'][name] = -1;
        results['Delete'][name] = -1;
        results['DeepModify'][name] = -1;
      }
    }

    // 输出最终结果
    console.table(results);
  }

  private async cleanupMemory() {
    // 等待垃圾回收
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 只检查 window 对象
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
  }

  private async benchmarkAdd(managers: Record<string, HistoryManager<any>>): Promise<number> {
    const [name, manager] = Object.entries(managers)[0];
    const start = performance.now();
    
    try {
      if (name === 'NativeImmutable') {
        for (let i = 0; i < 5; i++) {
          const currentState = manager.getCurrentState();
          const newState = [...currentState, {
            id: 999999 + i,
            name: `New Item ${i}`,
            description: `New description ${i}`,
            metadata: {
              created: new Date(),
              modified: new Date(),
              tags: [],
              properties: {}
            },
            children: []
          }];
          manager.push(newState);
        }
      } else if (name === 'Immutable') {
        for (let i = 0; i < 5; i++) {
          const currentState = (manager as ImmutableHistoryManager<any>).getCurrentImmutableState();
          const newState = currentState.push(Map({
            id: 999999 + i,
            name: `New Item ${i}`,
            description: `New description ${i}`,
            metadata: Map({
              created: new Date(),
              modified: new Date(),
              tags: List(),
              properties: Map()
            }),
            children: List()
          }));
          manager.push(newState);
        }
      } else {
        for (let i = 0; i < 5; i++) {
          const currentState = manager.getCurrentState();
          const newState = [...currentState];
          newState.push({
            id: 999999 + i,
            name: `New Item ${i}`,
            description: `New description ${i}`,
            metadata: {
              created: new Date(),
              modified: new Date(),
              tags: [],
              properties: {}
            },
            children: []
          });
          manager.push(newState);
        }
      }

      const end = performance.now();
      const duration = end - start;
      console.log(`${name} Add: ${duration}ms`);
      return duration;
    } catch (error) {
      console.error(`${name} Add 测试失败:`, error);
      return -1;
    }
  }

  private async benchmarkDelete(managers: Record<string, HistoryManager<any>>): Promise<number> {
    const [name, manager] = Object.entries(managers)[0];
    const start = performance.now();
    
    try {
      if (name === 'NativeImmutable') {
        for (let i = 0; i < 5; i++) {
          const currentState = manager.getCurrentState();
          const newState = currentState.slice(0, -1);
          manager.push(newState);
        }
      } else if (name === 'Immutable') {
        for (let i = 0; i < 5; i++) {
          const currentState = (manager as ImmutableHistoryManager<any>).getCurrentImmutableState();
          const newState = currentState.pop();
          manager.push(newState);
        }
      } else {
        for (let i = 0; i < 5; i++) {
          const currentState = manager.getCurrentState();
          const newState = [...currentState];
          newState.splice(newState.length - 1, 1);
          manager.push(newState);
        }
      }

      const end = performance.now();
      const duration = end - start;
      console.log(`${name} Delete: ${duration}ms`);
      return duration;
    } catch (error) {
      console.error(`${name} Delete 测试失败:`, error);
      return -1;
    }
  }

  private async benchmarkDeepModify(managers: Record<string, HistoryManager<any>>): Promise<number> {
    const [name, manager] = Object.entries(managers)[0];
    const start = performance.now();
    
    try {
      if (name === 'NativeImmutable') {
        for (let i = 0; i < 5; i++) {
          const currentState = manager.getCurrentState();
          const newState = [...currentState];
          newState[0] = {
            ...newState[0],
            children: [...newState[0].children],
            metadata: {
              ...newState[0].metadata,
              properties: {
                ...newState[0].metadata.properties,
                [`newProp${i}`]: `value${i}`
              }
            }
          };
          newState[0].children[0] = {
            ...newState[0].children[0],
            nested: {
              ...newState[0].children[0].nested,
              data: [...newState[0].children[0].nested.data.slice(0)]
            }
          };
          newState[0].children[0].nested.data[0] = Math.random();
          manager.push(newState);
        }
      } else if (name === 'Immutable') {
        for (let i = 0; i < 5; i++) {
          const currentState = (manager as ImmutableHistoryManager<any>).getCurrentImmutableState();
          const newState = currentState
            .setIn([0, 'children', 0, 'nested', 'data', 0], Math.random())
            .setIn(
              [0, 'metadata', 'properties', `newProp${i}`],
              `value${i}`
            );
          manager.push(newState);
        }
      } else {
        for (let i = 0; i < 5; i++) {
          const currentState = manager.getCurrentState();
          const newState = [...currentState];
          if (newState[0] && newState[0].children[0]) {
            newState[0] = {
              ...newState[0],
              children: [...newState[0].children],
              metadata: {
                ...newState[0].metadata,
                properties: {
                  ...newState[0].metadata.properties,
                  [`newProp${i}`]: `value${i}`
                }
              }
            };
            newState[0].children[0] = {
              ...newState[0].children[0],
              nested: {
                ...newState[0].children[0].nested,
                data: [...newState[0].children[0].nested.data]
              }
            };
            newState[0].children[0].nested.data[0] = Math.random();
          }
          manager.push(newState);
        }
      }

      const end = performance.now();
      const duration = end - start;
      console.log(`${name} DeepModify: ${duration}ms`);
      return duration;
    } catch (error) {
      console.error(`${name} DeepModify 测试失败:`, error);
      return -1;
    }
  }
} 