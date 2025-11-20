declare interface HierarchyNode {
  id: string;
  type: string;
  name: string;
  children?: HierarchyNode[];
}
