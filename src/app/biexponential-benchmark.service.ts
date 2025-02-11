import { Injectable } from '@angular/core';
import { BiexponentialTranslator, constructBiExponentialTranslator } from './bi-exponential';

interface BenchmarkResult {
  operation: string;
  duration: number;
  samplesCount: number;
  averageTime: number;
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
} 