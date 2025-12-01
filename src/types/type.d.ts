declare interface HierarchyNode {
  id: number;
  type: string;
  name: string;
  children?: HierarchyNode[];
}
declare interface Vector {
  x?: number;
  y?: number;
  z?: number;
  w?: number;
}

declare type FileInfo = [string, ArrayBuffer];
