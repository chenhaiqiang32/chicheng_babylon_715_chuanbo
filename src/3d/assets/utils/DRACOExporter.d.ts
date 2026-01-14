export interface DRACOExporterOptions {
  decodeSpeed?: number;
  encodeSpeed?: number;
  encoderMethod?: number;
  quantization?: number[];
  exportUvs?: boolean;
  exportNormals?: boolean;
  exportColor?: boolean;
}

export class DRACOExporter {
  constructor();
  parse(object: any, options?: DRACOExporterOptions): Uint8Array;
}
