import { Observable } from "@babylonjs/core";
//import { dirname, join } from "path/posix";
function getExtname(path: string) {
    const lastDotIndex = path.lastIndexOf(".");
    if (lastDotIndex === -1) {
        return "";
    }
    return path.substring(lastDotIndex);
}
function joinPaths(...segments: string[]) {
    return segments.filter(seg => seg).join('/').replace(/\/\/+/g, '/');
}
// 浏览器兼容的dirname替代函数
function getDirname(path: string) {
    const lastSlashIndex = path.lastIndexOf('/');
    if (lastSlashIndex === -1) return '';
    return path.substring(0, lastSlashIndex);
}
export interface IProjectConfiguration {
	path: string | null;
	compressedTexturesEnabled: boolean;
}

export const projectConfiguration: IProjectConfiguration = {
	path: null,
	compressedTexturesEnabled: false,
};

export const onProjectConfigurationChangedObservable = new Observable<IProjectConfiguration>();

/**
 * Returns the rootUrl for assets for the current project.
 */
export function getProjectAssetsRootUrl() {
	return projectConfiguration.path ? joinPaths(getDirname(projectConfiguration.path), "/") : null;
}
