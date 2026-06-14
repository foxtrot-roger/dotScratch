import { SketchCanvas, ITool, IToolProperties, Line, SketchData, Point } from "./MyCanvas";
import { Editable } from "./bindings";

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

    public async render(properties: IToolProperties, canvas: SketchCanvas, line: Line): Promise<void> {
        if (line.points.length === 0) return;

        const ctx = canvas.getContext();
        if (!ctx) return;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (line.points.length === 1) {
            const p = canvas.worldToCanvas(line.points[0]);
            const radius = (properties.thickness * canvas.getScale() * (line.points[0].pressure ?? 0.5)) / 2;

            ctx.fillStyle = properties.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.5, radius), 0, Math.PI * 2);
            ctx.fill();
        }
        else {
            ctx.strokeStyle = properties.color;

            for (let i = 1; i < line.points.length; i++) {
                const p1 = canvas.worldToCanvas(line.points[i - 1]);
                const p2 = canvas.worldToCanvas(line.points[i]);

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);

                const computedPressure = line.points[i].pressure !== undefined ? line.points[i].pressure : 0.5;
                ctx.lineWidth = Math.max(0.5, properties.thickness * canvas.getScale() * computedPressure);
                ctx.stroke();
            }
        }
    }

    public pointerDown(canvas: SketchCanvas, sketch: SketchData, point: Point, event: PointerEvent): void {
        const newLine: Line = {
            tool: this.name,
            properties: { ...this.properties },
            points: [point]
        };
        sketch.lines.push(newLine);
    }

    public pointerMove(canvas: SketchCanvas, sketch: SketchData, point: Point, event: PointerEvent): void {
        if (sketch.lines.length === 0) return;
        if (!canvas.getIsDrawing()) return;

        const currentLine = sketch.lines[sketch.lines.length - 1];
        currentLine.points.push(point);
    }

    public pointerUp(canvas: SketchCanvas, sketch: SketchData, point: Point, event: PointerEvent): void {

    }
}