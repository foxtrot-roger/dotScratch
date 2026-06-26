import { LineRenderer2D } from "./renderers-line";

export interface IVector2D {
    x: number;
    y: number;
}
export class Vector2D implements IVector2D {
    constructor(public x: number, public y: number) { }

    public static get ZERO() { return new Vector2D(0, 0); }
    public static get ONE() { return new Vector2D(1, 1); }
}

export class Transform {
    constructor(public position: IVector2D = { x: 0, y: 0 }, public scale: IVector2D = { x: 1, y: 1 }) { }

    public toGlobal(local: IVector2D) {
        return {
            x: (local.x * this.scale.x) + this.position.x,
            y: (local.y * this.scale.y) + this.position.y
        };
    }
    public toLocal(global: IVector2D) {
        return {
            x: (global.x - this.position.x) / this.scale.x,
            y: (global.y - this.position.y) / this.scale.y
        };
    }
}

export interface ICanvasTransform {
    getScale(): number;
    worldToCanvas(position: IVector2D): IVector2D;
    canvasToWorld(position: IVector2D): IVector2D;
}
export interface ICanvasObject {
    renderer: string;
}
export interface ICanvasRenderer {
    get rendererKey();
    render(canvas: CanvasRenderingContext2D, transform: ICanvasTransform, data: ICanvasObject): void;
}
export class CanvasRenderer implements ICanvasRenderer {
    constructor(public renderers: Map<string, ICanvasRenderer> = new Map<string, ICanvasRenderer>()) { }
    get rendererKey(): string { return "CanvasRenderer" };

    public addRenderer(renderer: ICanvasRenderer) {
        this.renderers.set(renderer.rendererKey, renderer);
    }

    render(canvas: CanvasRenderingContext2D, transform: ICanvasTransform, data: ICanvasObject): void {
        if (!data.renderer) data.renderer = LineRenderer2D.name;

        const renderer = this.renderers.get(data.renderer);
        if (!renderer) throw new Error(`No renderer defined for ${data.renderer}`);

        renderer.render(canvas, transform, data);
    }
}