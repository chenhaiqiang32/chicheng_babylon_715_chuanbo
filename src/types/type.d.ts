declare interface HierarchyNode {
  id: string;
  type: string;
  name: string;
  children?: HierarchyNode[];
}

declare type FileInfo = [string, ArrayBuffer];
