export namespace ArrayUtils {
  export function remove<T>(item: T, arr: T[]) {
    const index = arr.indexOf(item);
    if (arr.length == 1 && index == 0) {
      arr.pop();
      return;
    }
    if (index !== -1) {
      arr[index] = arr[arr.length - 1];
      arr.pop();
    }
  }
  export function groupArray<T>(array: Array<T>, size: number): T[][] {
    const result: T[][] = [];
    for (let index = 0; index < array.length; index += size) {
      result.push(array.slice(index, index + size));
    }
    return result;
  }
}
