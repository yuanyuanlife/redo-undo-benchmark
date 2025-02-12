import { Injectable } from '@angular/core';
import { BiexponentialTranslator, constructBiExponentialTranslator } from './bi-exponential';

interface BenchmarkResult {
  operation: string;
  duration: number;
  samplesCount: number;
  averageTime: number;
}

interface MemoryTestResult {
  instanceCount: number;
  totalMemoryBytes: number;
  averagePerInstanceBytes: number;
}

@Injectable({
    providedIn: 'root'
})
export class BiexponentialBenchmarkService {
  
  async runBenchmarks() {
    const results: BenchmarkResult[] = [];
    
    // 测试实例化性能
    results.push(await this.benchmarkConstruction());
    
    // 测试 translateToLinear 性能
    results.push(await this.benchmarkTranslateToLinear());
    
    // 测试 translateFromLinear 性能
    results.push(await this.benchmarkTranslateFromLinear());
    
    // 测试 solve 方法性能
    results.push(await this.benchmarkSolve());
    
    // 测试 inverse 方法性能
    results.push(await this.benchmarkInverse());
    
    // 测试 seriesBiexponential 方法性能
    results.push(await this.benchmarkSeriesBiexponential());

    // 添加内存使用测试
    console.log('\nBiexponentialTranslator 内存使用测试:');
    const memoryResult = await this.benchmarkMemoryUsage();
    console.table([{
      '缓存实例数': memoryResult.instanceCount,
      '总内存占用(Bytes)': memoryResult.totalMemoryBytes.toFixed(0),
      '每实例平均内存(Bytes)': memoryResult.averagePerInstanceBytes.toFixed(0)
    }]);

    // 输出结果
    console.log('\nBiexponentialTranslator 性能测试结果:');
    console.table(results.map(result => ({
      '操作': result.operation,
      '总耗时(μs)': (result.duration * 1000).toFixed(2),
      '样本数': result.samplesCount,
      '平均耗时(μs)': (result.averageTime * 1000).toFixed(3)
    })));
  }

  private async benchmarkConstruction(): Promise<BenchmarkResult> {
    const samples = 1000;
    const start = performance.now();
    
    for (let i = 0; i < samples; i++) {
      const rValue = Math.random() * 10;
      const linearMax = 1000 + Math.random() * 9000;
      new BiexponentialTranslator(rValue, linearMax);
    }
    
    const duration = performance.now() - start;
    return {
      operation: '实例化',
      duration,
      samplesCount: samples,
      averageTime: duration / samples
    };
  }

  private async benchmarkTranslateToLinear(): Promise<BenchmarkResult> {
    const translator = new BiexponentialTranslator(1, 1000);
    const samples = 10000;
    const values = Array.from({ length: samples }, () => Math.random() * 4.5);
    
    const start = performance.now();
    for (const value of values) {
      translator.translateToLinear(value);
    }
    
    const duration = performance.now() - start;
    return {
      operation: 'translateToLinear',
      duration,
      samplesCount: samples,
      averageTime: duration / samples
    };
  }

  private async benchmarkTranslateFromLinear(): Promise<BenchmarkResult> {
    const translator = new BiexponentialTranslator(1, 1000);
    const samples = 10000;
    const values = Array.from({ length: samples }, () => Math.random() * 1000);
    
    const start = performance.now();
    for (const value of values) {
      translator.translateFromLinear(value);
    }
    
    const duration = performance.now() - start;
    return {
      operation: 'translateFromLinear',
      duration,
      samplesCount: samples,
      averageTime: duration / samples
    };
  }

  private async benchmarkSolve(): Promise<BenchmarkResult> {
    const translator = new BiexponentialTranslator(1, 1000);
    const samples = 1000;
    const testCases = Array.from({ length: samples }, () => ({
      b: Math.random() * 10,
      w: Math.random()
    }));
    
    const start = performance.now();
    for (const { b, w } of testCases) {
      translator.solve(b, w);
    }
    
    const duration = performance.now() - start;
    return {
      operation: 'solve',
      duration,
      samplesCount: samples,
      averageTime: duration / samples
    };
  }

  private async benchmarkInverse(): Promise<BenchmarkResult> {
    const translator = new BiexponentialTranslator(1, 1000);
    const samples = 10000;
    const values = Array.from({ length: samples }, () => Math.random() * 4.5);
    
    const start = performance.now();
    for (const value of values) {
      translator.inverse(value);
    }
    
    const duration = performance.now() - start;
    return {
      operation: 'inverse',
      duration,
      samplesCount: samples,
      averageTime: duration / samples
    };
  }

  private async benchmarkSeriesBiexponential(): Promise<BenchmarkResult> {
    const translator = new BiexponentialTranslator(1, 1000);
    const samples = 10000;
    const values = Array.from({ length: samples }, () => Math.random() * 4.5);
    
    const start = performance.now();
    for (const value of values) {
      translator.seriesBiexponential(value);
    }
    
    const duration = performance.now() - start;
    return {
      operation: 'seriesBiexponential',
      duration,
      samplesCount: samples,
      averageTime: duration / samples
    };
  }

  // 测试缓存版本的性能
  async benchmarkCachedConstruction() {
    const samples = 1000;
    const start = performance.now();
    
    for (let i = 0; i < samples; i++) {
      const rValue = Math.random() * 10;
      const linearMax = 1000 + Math.random() * 9000;
      constructBiExponentialTranslator(rValue, linearMax);
    }
    
    const duration = performance.now() - start;
    console.log('\n缓存版本性能测试:');
    console.table([{
      '操作': '缓存实例化',
      '总耗时(μs)': (duration * 1000).toFixed(2),
      '样本数': samples,
      '平均耗时(μs)': (duration * 1000 / samples).toFixed(3)
    }]);
  }

  private getMemoryUsage(): number {
    // 返回字节数而不是 KB
    const memory = (performance as any).memory;
    if (!memory) {
      console.warn('请使用 Chrome 并添加 --enable-precise-memory-info 标志来获取准确的内存使用数据');
      return 0;
    }
    return memory.usedJSHeapSize; // 直接返回字节数
  }

  async benchmarkMemoryUsage(): Promise<MemoryTestResult> {
    if ((window as any).gc) {
      (window as any).gc();
    }
    await new Promise(resolve => setTimeout(resolve, 100));

    const initialMemory = this.getMemoryUsage();
    const instances: BiexponentialTranslator[] = [];
    const sampleSize = 100;

    for (let i = 0; i < sampleSize; i++) {
      const rValue = (i % 10) * 0.1 + 0.1;
      const linearMax = 1000 + (i % 9) * 100;
      instances.push(constructBiExponentialTranslator(rValue, linearMax));
    }

    if ((window as any).gc) {
      (window as any).gc();
    }
    await new Promise(resolve => setTimeout(resolve, 100));

    const finalMemory = this.getMemoryUsage();
    const totalMemory = Math.max(0, finalMemory - initialMemory);

    const uniqueInstances = new Set(instances).size;

    const result = {
      instanceCount: uniqueInstances,
      totalMemoryBytes: totalMemory,
      averagePerInstanceBytes: totalMemory / uniqueInstances
    };

    console.log('\nBiexponentialTranslator 内存使用详情:');
    console.log(`总测试实例数: ${sampleSize}`);
    console.log(`实际缓存实例数: ${uniqueInstances}`);
    console.log(`参数复用率: ${((1 - uniqueInstances / sampleSize) * 100).toFixed(2)}%`);
    console.log(`总内存占用: ${(totalMemory / 1024).toFixed(2)} KB (${totalMemory.toFixed(0)} Bytes)`);
    console.log(`每实例平均内存: ${(result.averagePerInstanceBytes / 1024).toFixed(2)} KB (${result.averagePerInstanceBytes.toFixed(0)} Bytes)`);

    return result;
  }
} 