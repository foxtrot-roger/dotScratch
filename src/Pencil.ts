import { SketchCanvas, ITool, IToolProperties, SketchData, Point } from "./MyCanvas";
import { Editable } from "./bindings";
import { Line2D } from "./renderers-line";

export class Pencil implements ITool {
    public name = 'pencil';
    public icon = '✏️';

    public editable: Editable;
    public properties: IToolProperties = { color: "#000000", thickness: 5 };
    public quickProperties: string[] = ["color", "thickness"];

    constructor() {
        this.editable = new Editable(this.properties);
        this.editable.setEditor('color', 'color');
        this.editable.setEditor('thickness', 'thickness');
    }

    public pointerDown(canvas: SketchCanvas, sketch: SketchData, point: Point, event: PointerEvent): void {
        const newLine = new Line2D({
            ...this.properties,
            points: [point]
        });

        if (!sketch.objects)
            sketch.objects = [];

        sketch.objects.push(newLine);
    }

    public pointerMove(canvas: SketchCanvas, sketch: SketchData, point: Point, event: PointerEvent): void {
        if (sketch.objects.length === 0) return;
        if (!canvas.getIsDrawing()) return;

        const currentLine = sketch.objects[sketch.objects.length - 1] as Line2D;
        currentLine.points.push({ ...point });
    }

    public pointerUp(canvas: SketchCanvas, sketch: SketchData, point: Point, event: PointerEvent): void {

    }
}