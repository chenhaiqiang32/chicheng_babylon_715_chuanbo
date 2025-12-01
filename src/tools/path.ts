export function getExtname(path: string) {
    const lastDotIndex = path.lastIndexOf(".");
    if (lastDotIndex === -1) {
        return "";
    }
    return path.substring(lastDotIndex);
}
export function joinPaths(...segments: string[]) {
    return segments.filter(seg => seg).join('/').replace(/\/\/+/g, '/');
}
// 浏览器兼容的dirname替代函数
export function getDirname(path: string) {
    const lastSlashIndex = path.lastIndexOf('/');
    if (lastSlashIndex === -1) return '';
    return path.substring(0, lastSlashIndex);
}