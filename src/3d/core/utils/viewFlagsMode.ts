// 模型试图状态可以叠加，所以用位bit来实现
export enum ViewFlagsMode {
  None = 0,
  Gizmos = 1 << 0,
  Mask = 1 << 1,        // 材质高亮
}

export function hasViewFlag(mode: ViewFlagsMode, flag: ViewFlagsMode) : boolean {
    return (mode & flag) !== 0;
}

export function addViewFlag(mode: ViewFlagsMode, flag: ViewFlagsMode) : ViewFlagsMode {
    mode |= flag;
    return mode;
}


export function removeViewFlag(mode: ViewFlagsMode, flag: ViewFlagsMode) : ViewFlagsMode {
    mode &= ~flag;
    return mode;
}

/**
 * 切换对应位
 */
export function toggleViewFlag(mode: ViewFlagsMode, flag: ViewFlagsMode) : ViewFlagsMode {
    if(hasViewFlag(mode, flag))
        mode = removeViewFlag(mode, flag);
    else 
        mode = addViewFlag(mode, flag)
    return mode;
}