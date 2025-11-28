import { AbstractMesh, PickingInfo, PointerEventTypes, Scene } from "@babylonjs/core";

export interface LeftClickOptions {
    /** 判断拖拽像素阈值 */
    dragThreshold?: number;

    onClick:() => void;
}

/** 注册鼠标左键点击事件 */
export function registerLeftClick(
    scene: Scene,
    options: LeftClickOptions
){
    const dragThreshold = options.dragThreshold ?? 3;
    let downX = 0;
    let downY = 0;
    let isDown = false;

    scene.onPointerObservable.add((pointerInfo) => {
        const evt = pointerInfo.event;
        switch(pointerInfo.type){
            case PointerEventTypes.POINTERDOWN:
                if(evt.button === 0) {
                    isDown = true;
                    downX = evt.clientX;
                    downY = evt.clientY;
                }
                break;

            // 左键拖拽不会触发 onClick 事件
            case PointerEventTypes.POINTERUP:
                if(evt.button === 0 && isDown){
                    const dx = evt.clientX - downX;
                    const dy = evt.clientY - downY;

                    const isDrag = Math.sqrt(dx * dx + dy * dy) > dragThreshold;

                    // 点击（非拖拽）
                    if(!isDrag){
                        options.onClick?.();
                    }
                }
                isDown = false;
                break;
        }
    })
}