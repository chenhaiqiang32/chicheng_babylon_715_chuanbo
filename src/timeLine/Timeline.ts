import { Application, FederatedPointerEvent, Graphics } from "pixi.js";
import { HeaderTime } from "./HeaderTime";
import { BACKGROUND_COLOR, UNIT } from "./Const";
import { KeyframeContent } from "./KeyframeContent";
import { TimeControls } from './TimeControls';
import { debounce } from "@/utils/Function";



export interface TimelineConfig {
    maxTime: number;
    devicePixelRatio: number,
}


export class Timeline {


    private static instance: Timeline;

    static get Instance() {
        if (!Timeline.instance) {
            Timeline.instance = new Timeline();
        }
        return Timeline.instance;
    }

    private app: Application;
    private resizeObserver: ResizeObserver;
    private dom: HTMLElement;
    private header: HeaderTime;
    private keyframeContent: KeyframeContent<KeyframeData>;
    private sizeDom: HTMLElement;
    private column: number = 0;
    private currentScale = 1;

    private timeControls: TimeControls;

    private requestId: number;
    private background: Graphics;

    private selectBox: Graphics;

    private maxTime = 100;
    constructor() {
        this.app = new Application();
    }

    get time() {
        return this.timeControls?.currentTime ?? 0;
    }
    set time(value: number) {
        if (value < 0) {
            value = 0;
        }
        if (value > this.maxTime) {
            value = this.maxTime;
        }
        if (this.timeControls) {
            this.timeControls.currentTime = value;
        }
    }




    get speed() {
        return this.timeControls.speed;
    }
    set speed(value: number) {
        if (this.timeControls) {
            this.timeControls.speed = (value);
        }
    }

    async init(config: Partial<TimelineConfig>, dom: HTMLElement) {
        this.dom = dom;
        if (this.dom.style.position !== 'absolute' && this.dom.style.position !== 'relative') {
            this.dom.style.position = 'relative';
        }
        this.maxTime = config.maxTime ?? 100;
        await this.app.init({
            background: BACKGROUND_COLOR,
            antialias: true,
            autoDensity: true,
            resolution: window.devicePixelRatio
        });
        if (dom) {
            dom.appendChild(this.app.canvas);
        }

        this.background = new Graphics();
        this.app.stage.addChild(this.background);
        this.background.eventMode = 'static';



        this.background.addEventListener('pointerdown', (e) => {
            this.keyframeContent.clearSelectKeyframe();
            let startPos = e.getLocalPosition(this.background);
            const move = (e: FederatedPointerEvent) => {
                const endPos = e.getLocalPosition(this.background);
                this.selectBox.clear();
                const x = Math.min(startPos.x, endPos.x);
                const y = Math.min(startPos.y, endPos.y);
                const w = Math.abs(startPos.x - endPos.x);
                const h = Math.abs(startPos.y - endPos.y);
                this.selectBox.rect(x, y, w, h).fill({
                    color: 0xff0000,
                    alpha: 0.2
                });
                this.keyframeContent.selectKeyframeByRect(x, y, w, h);
            };
            this.background.addEventListener('pointermove', move);
            window.addEventListener('pointerup', () => {
                this.background.removeEventListener('pointermove', move);
                this.selectBox.clear();
            }, {
                once: true
            });
        });
        this.app.canvas.style.position = 'sticky';
        this.app.canvas.style.left = '0px';
        this.app.canvas.style.top = '0px';
        this.app.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
        this.resizeObserver = new ResizeObserver(this.resize);
        this.resizeObserver.observe(dom);


        this.dom.addEventListener('scroll', this.onScroll);
        this.keyframeContent = new KeyframeContent(this.maxTime);
        this.app.stage.addChild(this.keyframeContent.container);


        this.header = new HeaderTime(this.maxTime);
        this.header.onSetTime = e => this.time = e;
        this.app.stage.addChild(this.header.container);


        this.sizeDom = document.createElement('div');
        this.sizeDom.style.width = this.maxTime * UNIT * this.currentScale + 'px';
        this.dom.appendChild(this.sizeDom);

        this.timeControls = new TimeControls(this.dom);
        this.selectBox = new Graphics();
        this.app.stage.addChild(this.selectBox);
        this.update();



    }



    setTimeChanged(callback: (time: number) => void) {
        this.timeControls.setTimeChanged(callback);
    }

    onScroll = () => {
        this.app.stage.x = -this.dom.scrollLeft;
        let scrollTop = this.dom.scrollTop;
        const max = Math.max(this.column * UNIT + 40 - this.dom.clientHeight, 0);
        this.keyframeContent.setTop(Math.min(scrollTop, max));
    };

    setTop(scrollTop: number) {
        this.keyframeContent.setTop(scrollTop);
    }

    dispose() {
        cancelAnimationFrame(this.requestId);
        this.resizeObserver.disconnect();
        this.timeControls.dispose();
        this.sizeDom.remove();
        this.app.canvas.remove();
        this.dom.removeEventListener('scroll', this.onScroll);
    }

    resize = () => {
        this.app.renderer.resize(this.dom.clientWidth, this.dom.clientHeight);
        this.timeControls.resize();
        this.background.clear();
        this.background.rect(0, 0, this.maxTime * UNIT * this.currentScale, this.dom.clientHeight).fill(BACKGROUND_COLOR);
    };

    setKeyframes(keyframes: KeyframeData[][]) {
        this.column = keyframes.length;
        this.keyframeContent.setKeyframes(keyframes);
    }

    get scale() {
        return this.currentScale;
    }
    set scale(scale: number) {
        this.onScaleChange(scale);
    }

    onScaleChange =
        debounce((scale: number) => {
            this.currentScale = scale;
            if (scale <= 0.5) {
                scale = 0.5;
            }
            this.currentScale = scale;
            this.header?.setScale(scale);
            this.keyframeContent?.setScale(scale);
            this.timeControls?.setScale(scale);
            if (this.sizeDom) {
                this.sizeDom.style.width = this.maxTime * UNIT * this.currentScale + 'px';
            }
        }, 100);

    update = () => {
        this.timeControls?.update();
        this.requestId = requestAnimationFrame(this.update);
    };


    play() {
        this.timeControls?.play();
    }
    stop() {
        this.timeControls?.stop();
    }
    pause() {
        this.timeControls?.pause();
    }
    seek(time: number) {
        this.time = time;
    }
    next() {
        this.time += 1;
    }
    prev() {

        this.time -= 1;
        if (this.time < 0) {
            this.time = 0;
        }
    }
    toEnd() {
        this.time = this.keyframeContent.getMaxTime();
        this.seek(this.time);
    }
    toStart() {
        this.time = 0;
    }


    // moveBlocks = (e: MouseEvent, keyframe: KeyframeBlock) => {
    //     if (e.button != 0) {
    //         return;
    //     }

    //     let startClipArgs: ClipArg[] = [];
    //     let flag = this.scale * unitWidth;
    //     document.body.requestPointerLock();
    //     const allTime = new Set<number>();
    //     this.tracks.map((track, index) => {
    //         if (index == keyframe.line || Math.abs(index - keyframe.line) > 10) {
    //             return;
    //         }
    //         track.times.forEach(time => allTime.add(time));
    //     });
    //     const move = (e: MouseEvent) => {
    //         if (startClipArgs.length == 0) {
    //             this.selectedBlock.forEach(clip => {
    //                 startClipArgs.push({
    //                     clip,
    //                     start: clip.start,
    //                     line: clip.line,
    //                 });
    //             });
    //         }
    //         let dx = e.movementX / flag;
    //         let canX = true;
    //         const needUpdateLine = new Set<number>();
    //         if (this.adsorb) {
    //             if (allTime.size > 0) {
    //                 const targetPos = keyframe.start + dx;
    //                 const closestTime = [...allTime].reduce((prev, curr) => {
    //                     return Math.abs(curr - targetPos) < Math.abs(prev - targetPos) ? curr : prev;
    //                 });
    //                 if (Math.abs(closestTime - targetPos) < 0.1) {
    //                     dx = closestTime - keyframe.start;
    //                 }
    //             }
    //         }


    //         for (let index = 0; index < this.selectedBlock.length; index++) {
    //             const clip = this.selectedBlock[index];
    //             if (clip.start + dx < 0) {
    //                 canX = false;
    //             }
    //         }
    //         if (canX) {
    //             this.selectedBlock.forEach(clip => {
    //                 clip.start += dx;
    //                 needUpdateLine.add(clip.line);
    //             });
    //         }
    //         needUpdateLine.forEach(line => this.allLine.find(x => x.height == line)?.updateLine());
    //     };
    //     const up = (e: MouseEvent) => {
    //         const clipArg2: ClipArg[] = [];
    //         this.selectedBlock.forEach(clip => {
    //             clipArg2.push({
    //                 clip,
    //                 start: clip.start,
    //                 line: clip.line,
    //             });
    //         });
    //         document.exitPointerLock();
    //         this.redoCommand(clipArg2, startClipArgs);
    //         document.removeEventListener('mousemove', move);
    //         document.removeEventListener('mouseup', up);
    //         document.body.style.cursor = 'unset';
    //     };
    //     document.addEventListener('mousemove', move);
    //     document.addEventListener('mouseup', up);
    // };

}