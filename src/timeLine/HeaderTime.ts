import { Container, Graphics, Text } from "pixi.js";
import { UNIT, HEADER_HEIGHT, BACKGROUND_COLOR, TEXT_COLOR } from "./Const";

export class HeaderTime {

    container: Container;
    private scale = 1

    onSetTime: (time: number) => void;


    constructor(count: number) {
        this.container = new Container();
        this.setHeader(count);
    }

    setHeader(count: number, scale = 1) {
        this.container.removeChildren();
        const line = new Graphics();
        this.container.addChild(line);
        const currentUnit = UNIT * scale;
        for (let index = 0; index < count; index++) {
            // 根据缩放比例决定是否显示所有刻度值
            if ((scale === 0.5 && index % 5 === 0) || scale !== 0.5) {
                const timeText = new Text({
                    text: index.toString(),
                    style: {
                        fill: TEXT_COLOR,
                        fontSize: 12,
                    }
                });
                timeText.x = index * currentUnit;
                timeText.y = 20;
                this.container.addChild(timeText);
            }

            line.moveTo(index * currentUnit, 0)
                .lineTo(index * currentUnit, (index % 5 == 0 ? 20 : 10)).stroke({
                    width: 1,
                    color: TEXT_COLOR,
                });
            for (let i = 0; i <= 4; i++) {
                line.moveTo((index + i / 5) * currentUnit, 0);
                line.lineTo((index + i / 5) * currentUnit, 5);
                line.stroke({
                    width: 1,
                    color: TEXT_COLOR,
                });
            }
        }
        const graphics = new Graphics();
        graphics.rect(0, 0, count * currentUnit, HEADER_HEIGHT).fill({
            color: BACKGROUND_COLOR
        });
        graphics.eventMode = 'static'
        graphics.cursor = 'pointer'
        graphics.addEventListener('click', e => {
            const time = e.getLocalPosition(this.container).x / this.scale / UNIT;
            this.onSetTime?.(time);
        })
        graphics.zIndex = -1;
        this.container.addChild(graphics);
    }

    setScale(scale: number) {
        this.scale = scale
        this.setHeader(this.container.children.length, scale);
    }
}
