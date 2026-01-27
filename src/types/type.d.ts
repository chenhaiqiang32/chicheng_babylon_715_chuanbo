declare interface HierarchyNode {
  id: string;
  type: string;
  name: string;
  children?: HierarchyNode[];
  isActive: boolean;
  isSelected?: boolean;
}
declare interface Vector {
  x?: number;
  y?: number;
  z?: number;
  w?: number;
}

declare type FileInfo = [string, ArrayBuffer];
