import { range } from 'lodash-es';

interface TestItem {
  id: number;
  name: string;
  description: string;
  metadata: {
    created: Date;
    modified: Date;
    tags: string[];
    properties: {
      [key: string]: string | number | boolean;
    };
  };
  children: {
    id: number;
    value: string;
    nested: {
      data: number[];
      flag: boolean;
    };
  }[];
}

export function generateLargeData(itemCount: number = 100): TestItem[] {
  return range(itemCount).map(i => ({
    id: i,
    name: `Item ${i}`,
    description: `This is a very long description for item ${i}...`.repeat(10),
    metadata: {
      created: new Date(),
      modified: new Date(),
      tags: range(10).map(t => `tag-${i}-${t}`),
      properties: range(20).reduce((acc, j) => {
        acc[`prop${j}`] = `value-${i}-${j}`.repeat(5);
        return acc;
      }, {} as Record<string, string>)
    },
    children: range(20).map(j => ({
      id: j,
      value: `child-${i}-${j}`.repeat(10),
      nested: {
        data: range(50).map(k => k * i * j),
        flag: (i + j) % 2 === 0
      }
    }))
  }));
} 