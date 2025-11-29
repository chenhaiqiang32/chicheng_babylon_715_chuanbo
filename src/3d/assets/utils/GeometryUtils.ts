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
  const output = new ArrayBuffer(totalSize);
  const dv = new DataView(output);
  dv.setUint32(0, headerBytes.byteLength, true);
  new Uint8Array(output, 4, headerBytes.byteLength).set(headerBytes);
  if (headerPad) {
    new Uint8Array(output, 4 + headerBytes.byteLength, headerPad).fill(0);
  }

  let writeOffset = 4 + headerBytes.byteLength + headerPad;
  for (const t of typedBuffers) {
    new Uint8Array(output, writeOffset, t.buffer.byteLength).set(new Uint8Array(t.buffer));
    writeOffset += t.buffer.byteLength;
  }

  return output;
}

export function bufferToVertex(buffer: ArrayBuffer): GeoData {
  const dv = new DataView(buffer);
  const headerLen = dv.getUint32(0, true);
  const headerBytes = new Uint8Array(buffer, 4, headerLen);
  const headerStr = new TextDecoder().decode(headerBytes);
  const info = JSON.parse(headerStr) as GeoInfo;
  const headerPad = (4 - (headerLen % 4)) % 4;
  const dataStart = 4 + headerLen + headerPad;
  const out: any = { uuid: info.uuid };
  for (const attr of info.attributes) {
    const start = dataStart + attr.start;
    const count = attr.byteLength >>> 2;
    if (attr.key.toLowerCase().includes('indices')) {
      const ta = new Uint32Array(buffer, start, count);
      out[attr.key] = Array.from(ta);
    } else {
      const ta = new Float32Array(buffer, start, count);
      out[attr.key] = Array.from(ta);
    }
  }
  return out;
}
