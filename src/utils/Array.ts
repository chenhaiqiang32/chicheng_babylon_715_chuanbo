export namespace ArrayUtils {
  export function remove<T>(item: T, arr: T[]) {
    const index = arr.indexOf(item);
    if (index !== -1) {
      arr[index] = arr[arr.length - 1];
      arr.pop();
    }
  }
  export function groupArray<T>(arr: T[], size: number) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }
}
