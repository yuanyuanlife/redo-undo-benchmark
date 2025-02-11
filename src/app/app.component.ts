import { Component, OnInit } from '@angular/core';
import { BenchmarkService } from './benchmark.service';
import { BiexponentialBenchmarkService } from './biexponential-benchmark.service';

@Component({
  selector: 'app-root',
  template: `
    <div class="container">
      <h2>性能测试面板</h2>
      
      <div class="test-section">
        <h3>不可变数据结构测试</h3>
        <button (click)="runHistoryBenchmarks()">运行历史记录测试</button>
      </div>

      <div class="test-section">
        <h3>BiexponentialTranslator 测试</h3>
        <button (click)="runBiexponentialBenchmarks()">运行转换器测试</button>
      </div>

      <div class="test-section">
        <h3>运行所有测试</h3>
        <button (click)="runAllBenchmarks()">运行所有测试</button>
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: 20px;
    }
    .test-section {
      margin: 20px 0;
      padding: 15px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    button {
      padding: 8px 16px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #0056b3;
    }
  `]
})
export class AppComponent implements OnInit {
  constructor(
    private benchmarkService: BenchmarkService,
    private biexponentialBenchmarkService: BiexponentialBenchmarkService
  ) {}

  async ngOnInit() {
    // 可以选择是否在初始化时自动运行测试
    // await this.runAllBenchmarks();
  }

  async runHistoryBenchmarks() {
    console.log('\n=== 开始历史记录性能测试 ===');
    await this.benchmarkService.runBenchmarks();
  }

  async runBiexponentialBenchmarks() {
    console.log('\n=== 开始 BiexponentialTranslator 性能测试 ===');
    await this.biexponentialBenchmarkService.runBenchmarks();
    await this.biexponentialBenchmarkService.benchmarkCachedConstruction();
  }

  async runAllBenchmarks() {
    console.log('\n=== 开始全部性能测试 ===');
    await this.runHistoryBenchmarks();
    console.log('\n');
    await this.runBiexponentialBenchmarks();
  }
}
