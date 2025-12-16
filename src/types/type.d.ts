declare interface HierarchyNode {
  id: string;
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
