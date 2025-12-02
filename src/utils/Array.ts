export namespace ArrayUtils {
  export function remove<T>(item: T, arr: T[]) {
    const index = arr.indexOf(item);
    if (index !== -1) {
      arr[index] = arr[arr.length - 1];
      arr.pop();
    }
  }
}
