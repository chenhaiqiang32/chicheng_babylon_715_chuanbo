declare interface KeyframeData {
    time: number
    // value 可能为 number | string | any[] | object 等
    value?: any
    // 可选的附加字段
    [key: string]: any
}