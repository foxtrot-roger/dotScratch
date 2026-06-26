import { Pencil } from "./Pencil";
import { IEditable } from "./bindings";
import { ICanvasObject, ICanvasRenderer, ICanvasTransform, IVector2D, Vector2D } from "./renderers";

export interface Point {
    x: number;
    y: number;
    pressure: number;
}

export interface Line {
    tool: string;
    properties: IToolProperties;
    points: Point[];
}

export interface SketchData {
    id: string | number;
    name: string;
    lines: Line[];
    objects: ICanvasObject[];
}

export interface IToolProperties {
    [key: string]: any;
}

export interface ITool {
    name: string;
    icon: string;
    properties: IToolProperties;
    quickProperties: string[];

    editable: IEditable;

    pointerDown(canvas: SketchCanvas, sketch: SketchData, point: Point, event: PointerEvent): void;
    pointerUp(canvas: SketchCanvas, sketch: SketchData, point: Point, event: PointerEvent): void;
    pointerMove(canvas: SketchCanvas, sketch: SketchData, point: Point, event: PointerEvent): void;
}

export class SketchCanvas implements ICanvasTransform {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    // Core Transformation Matrices
    private scale: number = 1.0;
    private offsetX: number = 0;
    private offsetY: number = 0;

    // Active Strategy Tool
    private tools: ITool[];
    public activeTool: ITool | null = null;

    // Brush & Environment Settings (Passed via ToolProperties bundle)
    public selectedColor: string = '#000000';
    public selectedThickness: number = 2;
    public isEraserMode: boolean = false;
    public fingerDrawEnabled: boolean = false;

    // State Tracking Flags
    private isDrawing: boolean = false;
    private isPanning: boolean = false;
    private isFingerPanning: boolean = false;

    // Pointer Coordinates Tracking
    private startX: number = 0;
    private startY: number = 0;
    private fStartX: number = 0;
    private fStartY: number = 0;

    // Multi-touch Zoom Cache Tracking
    private activePointers: PointerEvent[] = [];
    private initialDist: number = 0;
    private initialScale: number = 1.0;
    private initialWorldMid: IVector2D = { x: 0, y: 0 };


    // Structural Data Store Reference
    public currentSketchData: SketchData;

    // Callback to persist data to IndexedDB asynchronously
    private onSaveCallback?: (data: SketchData) => void;

    constructor(canvasElement: HTMLCanvasElement, tools: ITool[], public renderer: ICanvasRenderer, onSave?: (data: SketchData) => void) {
        this.canvas = canvasElement;
        const context = this.canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not obtain 2D rendering context from canvas.');
        }
        this.ctx = context;
        this.onSaveCallback = onSave;

        this.tools = tools;
        if (tools && tools.length > 0) {
            this.activeTool = tools[0];
        } else {
            this.activeTool = new Pencil() as unknown as ITool;
        }

        this.initDefaultLifeCycle();
    }

    public getContext(): CanvasRenderingContext2D { return this.ctx; }
    public getScale(): number { return this.scale; }
    public setIsDrawing(isDrawing: boolean): void { this.isDrawing = isDrawing; }
    public getIsDrawing(): boolean { return this.isDrawing; }

    private initDefaultLifeCycle(): void {
        this.setupPointerEvents();

        window.addEventListener('resize', () => this.resizeCanvas());
        this.resizeCanvas();
    }

    // --- Screen Vector Mapping Functions ---
    private screenToWorld(x: number, y: number): IVector2D {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = x - rect.left;
        const canvasY = y - rect.top;
        return {
            x: (canvasX - this.offsetX) / this.scale,
            y: (canvasY - this.offsetY) / this.scale
        };
    }
    public worldToCanvas(position: IVector2D): IVector2D {
        return {
            x: position.x * this.scale + this.offsetX,
            y: position.y * this.scale + this.offsetY
        };
    }
    public canvasToWorld(position: IVector2D): IVector2D {
        return {
            x: (position.x - this.offsetX) / this.scale,
            y: (position.y - this.offsetY) / this.scale
        }
    }

    // --- Canvas Pipeline Processing Core ---
    public renderCanvas(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawGrid();

        if (this.currentSketchData && this.currentSketchData.objects)
            this.currentSketchData.objects.forEach(line => {
                this.renderer.render(this.ctx, this, line);
            });

        const statsElement = document.getElementById('canvas-stats');
        if (statsElement) {
            statsElement.innerText = `Zoom: ${Math.round(this.scale * 100)}%`;
        }
    }

    private drawGrid(): void {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // 1. Determine the spatial bounds of the visible screen viewport in world units
        const topLeftWorld = this.canvasToWorld(Vector2D.ZERO);
        const bottomRightWorld = this.canvasToWorld({ x: width, y: height });

        // 2. Establish a dynamic step sizing rule based on zoom factor
        // As you zoom out, the grid size scales up (e.g., 50px, 100px, 200px...)
        let baseGridStep = 50;
        if (this.scale < 0.2) baseGridStep = 400;
        else if (this.scale < 0.5) baseGridStep = 200;
        else if (this.scale < 0.8) baseGridStep = 100;
        else if (this.scale > 3.0) baseGridStep = 10; // Zoomed in tight, show fine details

        // 3. Find the starting snap lines just outside the visible bounds
        const startX = Math.floor(topLeftWorld.x / baseGridStep) * baseGridStep;
        const endX = Math.ceil(bottomRightWorld.x / baseGridStep) * baseGridStep;
        const startY = Math.floor(topLeftWorld.y / baseGridStep) * baseGridStep;
        const endY = Math.ceil(bottomRightWorld.y / baseGridStep) * baseGridStep;

        ctx.save();
        ctx.strokeStyle = '#e2e8f0'; // Subtle light gray line color
        ctx.lineWidth = 1;

        // 4. Draw Vertical Grid Lines
        for (let wx = startX; wx <= endX; wx += baseGridStep) {
            // Map the world line position back to exact screen canvas coordinates
            const screenPos = this.worldToCanvas({ x: wx, y: 0 });

            ctx.beginPath();
            ctx.moveTo(screenPos.x, 0);
            ctx.lineTo(screenPos.x, height);
            ctx.stroke();
        }

        // 5. Draw Horizontal Grid Lines
        for (let wy = startY; wy <= endY; wy += baseGridStep) {
            const screenPos = this.worldToCanvas({ x: 0, y: wy });

            ctx.beginPath();
            ctx.moveTo(0, screenPos.y);
            ctx.lineTo(width, screenPos.y);
            ctx.stroke();
        }

        // 6. Optional: Draw a stronger Origin Axis (0,0 crossing)
        const origin = this.worldToCanvas(Vector2D.ZERO);

        // Y-Axis line (Vertical line at X = 0)
        if (origin.x >= 0 && origin.x <= width) {
            ctx.strokeStyle = '#cbd5e1'; // Slightly darker accent color
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(origin.x, 0);
            ctx.lineTo(origin.x, height);
            ctx.stroke();
        }

        // X-Axis line (Horizontal line at Y = 0)
        if (origin.y >= 0 && origin.y <= height) {
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, origin.y);
            ctx.lineTo(width, origin.y);
            ctx.stroke();
        }

        ctx.restore();
    }

    // --- Multi-Touch Calculation Utilities ---
    private getDistance(p1: PointerEvent, p2: PointerEvent): number {
        return Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
    }
    private getMidpoint(p1: PointerEvent, p2: PointerEvent): IVector2D {
        return {
            x: (p1.clientX + p2.clientX) / 2,
            y: (p1.clientY + p2.clientY) / 2
        };
    }

    // --- Pointer Event Handling Setup ---
    private setupPointerEvents(): void {
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());

        this.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
            if (e.button === 2 || e.button === 1) {
                this.isPanning = true;
                this.startX = e.clientX;
                this.startY = e.clientY;
                this.canvas.setPointerCapture(e.pointerId);
                return;
            }

            e.preventDefault();
            this.activePointers.push(e);

            if (this.activePointers.length === 1 && !this.isDrawing) {
                if (e.pointerType === 'touch' && !this.fingerDrawEnabled) {
                    this.isFingerPanning = true;
                    this.fStartX = e.clientX;
                    this.fStartY = e.clientY;
                    return;
                }

                this.isDrawing = true;
                const wCoord = this.screenToWorld(e.clientX, e.clientY);
                const currentPressure = (e.pointerType === 'mouse' && e.buttons === 1 && e.pressure === 0) ? 0.5 : (e.pressure || 0.5);

                const pointPayload: Point = { x: wCoord.x, y: wCoord.y, pressure: currentPressure };

                // DELEGATED TO ACTIVE TOOL
                if (this.activeTool) {
                    this.activeTool.pointerDown(this, this.currentSketchData, pointPayload, e);
                }

                this.renderCanvas();
            }
            else if (this.activePointers.length === 2) {
                this.isDrawing = false;
                this.isFingerPanning = false;

                if (this.currentSketchData.lines.length > 0 && this.currentSketchData.lines[this.currentSketchData.lines.length - 1].points.length === 1) {
                    this.currentSketchData.lines.pop();
                }

                this.initialDist = this.getDistance(this.activePointers[0], this.activePointers[1]);
                this.initialScale = this.scale;

                const screenMid = this.getMidpoint(this.activePointers[0], this.activePointers[1]);
                const rect = this.canvas.getBoundingClientRect();
                const canvasMidX = screenMid.x - rect.left;
                const canvasMidY = screenMid.y - rect.top;

                this.initialWorldMid = {
                    x: (canvasMidX - this.offsetX) / this.scale,
                    y: (canvasMidY - this.offsetY) / this.scale
                };
            }
        });

        this.canvas.addEventListener('pointermove', (e: PointerEvent) => {
            e.preventDefault();

            if (this.isPanning) {
                this.offsetX += e.clientX - this.startX;
                this.offsetY += e.clientY - this.startY;
                this.startX = e.clientX;
                this.startY = e.clientY;
                this.renderCanvas();
                return;
            }

            if (this.isFingerPanning && this.activePointers.length === 1) {
                this.offsetX += e.clientX - this.fStartX;
                this.offsetY += e.clientY - this.fStartY;
                this.fStartX = e.clientX;
                this.fStartY = e.clientY;
                this.renderCanvas();
                return;
            }

            const index = this.activePointers.findIndex(p => p.pointerId === e.pointerId);
            if (index !== -1) this.activePointers[index] = e;

            if (this.isDrawing && this.activePointers.length === 1) {
                const wCoord = this.screenToWorld(e.clientX, e.clientY);
                const currentPressure = (e.pointerType === 'mouse' && e.buttons === 1 && e.pressure === 0) ? 0.5 : (e.pressure || 0.5);

                const pointPayload: Point = { x: wCoord.x, y: wCoord.y, pressure: currentPressure };

                // DELEGATED TO ACTIVE TOOL
                if (this.activeTool) {
                    this.activeTool.pointerMove(this, this.currentSketchData, pointPayload, e);
                }

                this.renderCanvas();
            }
            else if (this.activePointers.length === 2) {
                const currentDist = this.getDistance(this.activePointers[0], this.activePointers[1]);
                const screenMid = this.getMidpoint(this.activePointers[0], this.activePointers[1]);

                const rect = this.canvas.getBoundingClientRect();
                const canvasMidX = screenMid.x - rect.left;
                const canvasMidY = screenMid.y - rect.top;

                const targetScale = this.initialScale * (currentDist / this.initialDist);
                this.scale = Math.max(0.1, Math.min(targetScale, 15));

                this.offsetX = canvasMidX - this.initialWorldMid.x * this.scale;
                this.offsetY = canvasMidY - this.initialWorldMid.y * this.scale;

                this.renderCanvas();
            }
        });

        const handlePointerUp = (e: PointerEvent) => {
            this.activePointers = this.activePointers.filter(p => p.pointerId !== e.pointerId);

            if (this.isPanning) {
                this.isPanning = false;
                this.canvas.releasePointerCapture(e.pointerId);
            }

            if (this.activePointers.length < 1) {
                this.isFingerPanning = false;
            }

            if (this.isDrawing) {
                this.isDrawing = false;

                const wCoord = this.screenToWorld(e.clientX, e.clientY);
                const pointPayload: Point = { x: wCoord.x, y: wCoord.y, pressure: e.pressure || 0.5 };

                // DELEGATED TO ACTIVE TOOL
                if (this.activeTool) {
                    this.activeTool.pointerUp(this, this.currentSketchData, pointPayload, e);
                }

                if (this.onSaveCallback) {
                    this.onSaveCallback(this.currentSketchData);
                }
            }

            if (this.activePointers.length < 2) {
                this.initialDist = 0;
            }
            this.renderCanvas();
        };

        this.canvas.addEventListener('pointerup', handlePointerUp);
        this.canvas.addEventListener('pointercancel', handlePointerUp);
        this.canvas.addEventListener('pointerleave', handlePointerUp);

        this.canvas.addEventListener('wheel', (e: WheelEvent) => {
            e.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const worldX = (mouseX - this.offsetX) / this.scale;
            const worldY = (mouseY - this.offsetY) / this.scale;

            const zoomIntensity = 0.1;
            if (e.deltaY < 0) {
                this.scale = Math.min(this.scale * (1 + zoomIntensity), 15);
            } else {
                this.scale = Math.max(this.scale * (1 - zoomIntensity), 0.1);
            }

            this.offsetX = mouseX - worldX * this.scale;
            this.offsetY = mouseY - worldY * this.scale;

            this.renderCanvas();
        }, { passive: false });
    }

    public resizeCanvas(): void {
        const container = this.canvas.parentElement;
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            this.renderCanvas();
        }
    }

    public loadSketchData(data: SketchData): void {
        this.currentSketchData = data;
        this.renderCanvas();
    }
}
