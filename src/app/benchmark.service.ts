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

interface PerformanceResult {
  duration: number;
  memoryUsed: number;
}

@Injectable({
  providedIn: 'root'
})
export class BenchmarkService {
  private data = generateLargeData(100);

  private getMemoryUsage(): number {
    // 使用 Chrome 的 performance.memory API
    const memory = (performance as any).memory;
    if (!memory) {
      console.warn('请使用 Chrome 并添加 --enable-precise-memory-info 标志来获取准确的内存使用数据');
      return 0;
    }
    return memory.usedJSHeapSize / 1024; // 转换为 KB
  }

  async runBenchmarks() {
    if (!(performance as any).memory) {
      console.warn(`
        注意：要获取准确的内存使用数据，请：
        1. 使用 Chrome 浏览器
        2. 使用以下命令行参数启动 Chrome：
           --enable-precise-memory-info --js-flags="--expose-gc"
        
        Windows: chrome.exe --enable-precise-memory-info --js-flags="--expose-gc"
        Mac: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --enable-precise-memory-info --js-flags="--expose-gc"
        Linux: google-chrome --enable-precise-memory-info --js-flags="--expose-gc"
      `);
    }

    const results: Record<string, Record<string, PerformanceResult>> = {
      'Add': {},
      'Delete': {},
      'DeepModify': {}
    };

    const implementations: Array<[string, () => HistoryManager<any>]> = [
      ['Lodash deepclone', () => new LodashHistoryManager(this.data)],
      ['JSON.stringify', () => new JsonHistoryManager(this.data)],
      ['Klona', () => new KlonaHistoryManager(this.data)],
      ['Immer', () => new ImmerHistoryManager(this.data)],
      ['Immutable', () => new ImmutableHistoryManager(this.data)],
      ['NativeImmutable', () => new NativeImmutableHistoryManager(this.data)]
    ];

    for (const [name, createManager] of implementations) {
      console.log(`\n测试 ${name}:`);
      try {
        const manager = createManager();
        
        // 强制垃圾回收（如果可用）
        if ((window as any).gc) {
          (window as any).gc();
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const initialMemory = this.getMemoryUsage();
        
        // 运行添加测试
        const addResult = await this.benchmarkAdd(name, manager);
        const afterAddMemory = this.getMemoryUsage();
        results['Add'][name] = {
          duration: addResult,
          memoryUsed: Math.max(0, afterAddMemory - initialMemory)
        };
        
        // 强制垃圾回收
        if ((window as any).gc) {
          (window as any).gc();
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 运行删除测试
        const deleteResult = await this.benchmarkDelete(name, manager);
        const afterDeleteMemory = this.getMemoryUsage();
        results['Delete'][name] = {
          duration: deleteResult,
          memoryUsed: Math.max(0, afterDeleteMemory - afterAddMemory)
        };
        
        // 强制垃圾回收
        if ((window as any).gc) {
          (window as any).gc();
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 运行修改测试
        const modifyResult = await this.benchmarkDeepModify(name, manager);
        const afterModifyMemory = this.getMemoryUsage();
        results['DeepModify'][name] = {
          duration: modifyResult,
          memoryUsed: Math.max(0, afterModifyMemory - afterDeleteMemory)
        };
        
      } catch (error) {
        console.error(`${name} 测试失败:`, error);
      }
    }

    // 输出详细结果
    console.log('\n性能测试结果:');
    Object.entries(results).forEach(([operation, implResults]) => {
      console.log(`\n${operation}操作:`);
      console.table(Object.entries(implResults).map(([impl, result]) => ({
        '实现': impl,
        '耗时(ms)': result.duration.toFixed(2),
        '内存增长(KB)': result.memoryUsed.toFixed(2)
      })));
    });
  }

  private async cleanupMemory() {
    // 等待垃圾回收
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 只检查 window 对象
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
  }

  private async benchmarkAdd(name: string, manager: HistoryManager<any>): Promise<number> {
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

  private async benchmarkDelete(name: string, manager: HistoryManager<any>): Promise<number> {
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

  private async benchmarkDeepModify(name: string, manager: HistoryManager<any>): Promise<number> {
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