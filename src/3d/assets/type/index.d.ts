declare interface AttributeInfo {
  key: string;
  start: number;
  byteLength: number;
}

declare interface GeoData {
  uuid: string;
  [key: string]: number[];
}

declare interface GeoInfo {
  uuid: string;
  attributes: AttributeInfo[];
}
