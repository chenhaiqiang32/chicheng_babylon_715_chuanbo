declare interface ContextMenuItem {
  name: { value: string } | string;
  callback?: () => void;
  subCommand?: ContextMenuItem[];
  disable?: boolean;
}

declare interface ContextMenu {
  position: { x: number; y: number };
  commands: ContextMenuItem[];
}
