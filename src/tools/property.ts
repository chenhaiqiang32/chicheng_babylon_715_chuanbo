export function setObjectValue(object: any, property: string, newValue: any): void {
  const parts = property.split('.');

  let value = object;

  for (let i = 0; i < parts.length - 1; ++i) {
    value = value[parts[i]];
  }

  value[parts[parts.length - 1]] = newValue;
}

export function getObjectValue(object: any, property: string) {
  if (!object || !property) {
    return undefined;
  }
  const parts = property.split('.');

  let value = object;

  for (let i = 0; i < parts.length; ++i) {
    value = value[parts[i]];
  }

  return value;
}
