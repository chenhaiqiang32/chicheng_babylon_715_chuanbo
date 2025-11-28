declare interface MenuItem {
  name: any;
  children?: MenuItem[];
  checked?: any;
  desc?: string;
  callback?: () => void;
  disabled?: any;
  class?: string;
}
