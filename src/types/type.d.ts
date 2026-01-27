declare interface HierarchyNode {
  id: string;
  type: string;
  name: string;
  children?: HierarchyNode[];
  isActive: boolean;
  isSelected?: boolean;
  isLeaf?: boolean;   // 是否为叶子节点
}
declare interface Vector {
  x?: number;
  y?: number;
  z?: number;
  w?: number;
}

declare type FileInfo = [string, ArrayBuffer];
