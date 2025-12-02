/**
 * 节流函数
 * @param func 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let lastArgs: Parameters<T> | null = null;
	let lastThis: ThisParameterType<T> | null = null;

	return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
		lastArgs = args;
		lastThis = this;

		if (!timeoutId) {
			timeoutId = setTimeout(() => {
				func.apply(lastThis, lastArgs as Parameters<T>);
				timeoutId = null;
				lastArgs = null;
				lastThis = null;
			}, delay);
		}
	};
}

/**
 * 防抖函数
 * @param func 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
		const context = this;
		clearTimeout(timeoutId as ReturnType<typeof setTimeout>);
		timeoutId = setTimeout(() => func.apply(context, args), delay);
	};
}