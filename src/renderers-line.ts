import { ICanvasTransform, ICanvasObject, ICanvasRenderer } from "./renderers";

export class Line2D implements ICanvasObject {

    renderer: string;
    thickness: number;
    color: string;
    points: LinePoint2D[];

    constructor(init?: Partial<Line2D>) {
        this.renderer = LineRenderer2D.RENDERER_KEY;
        Object.assign(this, init);
    }
}
export interface LinePoint2D {
    x: number;
    y: number;
    pressure: number;
}

export class LineRenderer2D implements ICanvasRenderer {
    static RENDERER_KEY: string = "LineRenderer2D";
    get rendererKey(): string { return LineRenderer2D.RENDERER_KEY };

    public render(canvas: CanvasRenderingContext2D, transform: ICanvasTransform, data: ICanvasObject): void {
        const line = data as Line2D;

        if (line.points.length === 0) return;

        const ctx = canvas;
        if (!ctx) return;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (line.points.length === 1) {
            const p = transform.worldToCanvas(line.points[0]);
            const radius = (line.thickness * transform.getScale() * (line.points[0].pressure ?? 0.5)) / 2;

            ctx.fillStyle = line.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.5, radius), 0, Math.PI * 2);
            ctx.fill();
        }
        else {
            ctx.strokeStyle = line.color;

            for (let i = 1; i < line.points.length; i++) {
                const p1 = transform.worldToCanvas(line.points[i - 1]);
                const p2 = transform.worldToCanvas(line.points[i]);

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);

                const computedPressure = line.points[i].pressure !== undefined ? line.points[i].pressure : 0.5;
                ctx.lineWidth = Math.max(0.5, line.thickness * transform.getScale() * computedPressure);
                ctx.stroke();
            }
        }
    }
}