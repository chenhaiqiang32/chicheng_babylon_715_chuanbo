import { Vector3 } from "@babylonjs/core";
import { CollisionAxis } from "./types";

/**
 * 碰撞体形状工具函数集
 * 提供轴向转换、向量序列化等通用工具函数
 */

/**
 * 根据轴向获取旋转角度
 * 将圆柱体/胶囊体从默认Y轴旋转到目标轴向
 * - X轴：绕Z轴旋转90°
 * - Y轴：无需旋转（默认方向）
 * - Z轴：绕X轴旋转90°
 * @param axis - 目标轴向
 * @returns 欧拉角旋转向量
 */
export function getAxisRotation(axis: CollisionAxis): Vector3 {
	switch (axis) {
		case "x": return new Vector3(0, 0, Math.PI / 2);  //绕Z轴旋转90°
		case "y": return Vector3.Zero();                  //默认Y轴，无需旋转
		case "z": return new Vector3(Math.PI / 2, 0, 0);  //绕X轴旋转90°
	}
}

/**
 * 根据轴向计算缩放向量
 * 将圆柱体从默认Y轴缩放到目标轴向的尺寸
 * @param axis - 目标轴向
 * @param radius - 圆柱半径
 * @param height - 圆柱高度
 * @returns 缩放向量
 */
export function getAxisScaling(axis: CollisionAxis, radius: number, height: number): Vector3 {
	const diameter = radius * 2;
	switch (axis) {
		case "x": return new Vector3(height, diameter, diameter);
		case "y": return new Vector3(diameter, height, diameter);
		case "z": return new Vector3(diameter, diameter, height);
	}
}

/**
 * 将 Vector3 转换为数组
 * 用于JSON序列化
 * @param vector - Babylon.js Vector3 对象
 * @returns 只读的三元数组 [x, y, z]
 */
export function vectorToArray(vector: Vector3): readonly [number, number, number] {
	return [vector.x, vector.y, vector.z] as const;
}

/**
 * 将数组转换为 Vector3
 * 用于JSON反序列化
 * @param array - 三元数组或数字数组
 * @returns Babylon.js Vector3 对象
 */
export function arrayToVector(array: readonly [number, number, number] | number[]): Vector3 {
	return new Vector3(array[0], array[1], array[2]);
}
