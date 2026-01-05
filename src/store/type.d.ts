declare interface ResInfo {
  uuid: string;
  name: string;
  createTime?: string;
  type: string;
  target?: any;
}

declare type Padding = () => Promise<void>;
