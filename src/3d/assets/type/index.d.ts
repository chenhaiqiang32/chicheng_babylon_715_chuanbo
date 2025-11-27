declare interface AttributeInfo {
  key: string;
  start: number;
  byteLength: number;
}

declare interface GeoData {
  id: string;
  buffer: { [key: string]: number[] };
}

declare interface GeoInfo {
  id: string;
  attributes: AttributeInfo[];
}
