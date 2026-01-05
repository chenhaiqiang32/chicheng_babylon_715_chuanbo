const textDecoder = new TextDecoder();

export function vertexToBuffer(g: GeoData) {
  const attributes: AttributeInfo[] = [];
  const typedBuffers: { key: string; buffer: ArrayBuffer }[] = [];
  let dataSectionOffset = 0;
  for (const [key, arr] of Object.entries(g)) {
    if (!Array.isArray(arr)) {
      continue;
    }
    let typed: ArrayBuffer;
    if (key.toLowerCase().includes('indices')) {
      const ta = new Uint32Array(arr);
      typed = ta.buffer;
    } else {
      const ta = new Float32Array(arr);
      typed = ta.buffer;
    }
    typedBuffers.push({ key, buffer: typed });
    attributes.push({ key, start: dataSectionOffset, byteLength: typed.byteLength });
    dataSectionOffset += typed.byteLength;
  }

  const geoInfo: GeoInfo = {
    uuid: g.uuid,
    attributes,
  };

  const headerStr = JSON.stringify(geoInfo);
  const headerBytes = new TextEncoder().encode(headerStr);
  const headerPad = (4 - (headerBytes.byteLength % 4)) % 4;

  const totalSize = 4 + headerBytes.byteLength + headerPad + dataSectionOffset;
  const output = new Uint8Array(totalSize);
  const dv = new DataView(output.buffer);
  dv.setUint32(0, headerBytes.byteLength, true);
  output.set(headerBytes, 4);
  if (headerPad) {
    output.fill(0, 4 + headerBytes.byteLength, 4 + headerBytes.byteLength + headerPad);
  }

  let writeOffset = 4 + headerBytes.byteLength + headerPad;
  for (const t of typedBuffers) {
    output.set(new Uint8Array(t.buffer), writeOffset);
    writeOffset += t.buffer.byteLength;
  }
  return output;
}

export function bufferToVertex(buffer: Uint8Array): GeoData {
  const arrayBuffer = buffer.buffer;
  const dv = new DataView(arrayBuffer);
  const headerLen = dv.getUint32(0, true);
  const headerBytes = new Uint8Array(arrayBuffer, 4, headerLen);
  const info = JSON.parse(textDecoder.decode(headerBytes)) as GeoInfo;
  const headerPad = (4 - (headerLen % 4)) % 4;
  const dataStart = 4 + headerLen + headerPad;
  const out: any = { uuid: info.uuid };

  for (const attr of info.attributes) {
    const start = dataStart + attr.start;
    const count = attr.byteLength >>> 2;
    const isIndices = attr.key.toLowerCase().includes('indices');
    const ta = isIndices
      ? new Uint32Array(arrayBuffer, start, count)
      : new Float32Array(arrayBuffer, start, count);
    out[attr.key] = ta;
  }

  return out;
}
