import { SketchCanvas, ITool, IToolProperties, Line, SketchData, Point } from "./MyCanvas";
import { Editable } from "./bindings";

export class Eraser implements ITool {
    public name = 'eraser';
    public icon = '🧽';

    public editable: Editable;
    public properties: IToolProperties = { thickness: 15 };
    public quickProperties: string[] = ["thickness"];
    constructor() {
        this.editable = new Editable(this.properties);
        this.editable.setEditor('thickness', 'thickness');
    }

    async render(properties: IToolProperties, canvas: SketchCanvas, line: Line): Promise<void> { }

    public pointerDown(canvas: SketchCanvas, sketch: SketchData, point: Point, event: PointerEvent): void {
        this.eraseLinesAt(point, this.properties.thickness, canvas, sketch);
    }
    public pointerMove(canvas: SketchCanvas, sketch: SketchData, point: Point, event: PointerEvent): void {
        if (canvas.getIsDrawing()) {
            this.eraseLinesAt(point, this.properties.thickness, canvas, sketch);
        }
    }
    public pointerUp(canvas: SketchCanvas, sketch: SketchData, point: Point, event: PointerEvent): void {
    }

    private eraseLinesAt(position: Point, eraseRadius: number, canvas: SketchCanvas, sketch: SketchData): void {
        if (!sketch || !sketch.lines) return;

        const currentScale = canvas.getScale();

        sketch.lines = sketch.lines.filter((line: Line) => {
            const isHit: boolean = line.points.some((pt: Point) => {
                const dx: number = pt.x - position.x;
                const dy: number = pt.y - position.y;
                const distanceSquared: number = dx * dx + dy * dy;

                const collision = (eraseRadius + (this.properties.thickness / 2)) / currentScale;

                return distanceSquared < collision * collision;
            });

            return !isHit;
        });
    }
}
