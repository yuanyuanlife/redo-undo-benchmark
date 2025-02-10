import { Component, OnInit } from '@angular/core';
import { BenchmarkService } from './benchmark.service';

@Component({
  selector: 'app-root',
  template: `
    <h1>Undo/Redo Benchmark</h1>
    <button (click)="runBenchmark()">运行性能测试（请打开 Console 控制台查看结果）</button>
  `
})
export class AppComponent implements OnInit {
  constructor(private benchmarkService: BenchmarkService) {}

  ngOnInit() {}

  async runBenchmark() {
    await this.benchmarkService.runBenchmarks();
  }
}
