import { MyIndexedDb } from './MyIndexedDb';
import { SketchCanvas, ITool } from './MyCanvas';
import { UiManager } from './MyTools';
import { Pencil } from './Pencil';
import { Eraser } from './Eraser';
import { ToolBarManager } from './MyToolMenu';
import { Observable, IEditable } from './bindings';
import { CanvasRenderer } from './renderers';
import { LineRenderer2D } from './renderers-line';

window.addEventListener('DOMContentLoaded', async () => {
    try {
        await MyIndexedDb.initialize();

        const savedData = await MyIndexedDb.getAll('sketches');

        const canvasElement = document.getElementById('sketchCanvas') as HTMLCanvasElement;
        const tools: ITool[] = [new Pencil(), new Eraser()];

        const renderers = new CanvasRenderer();
        renderers.renderers.set(LineRenderer2D.name, new LineRenderer2D());
        const engine = new SketchCanvas(canvasElement, tools, renderers, async (updatedData) => {
            await MyIndexedDb.set('sketches', updatedData);
        });

        if (savedData) {
            engine.loadSketchData(savedData[0]);
        }

        const toolbarElement = document.getElementById("top-bar");
        const toolbar = new ToolBarManager(toolbarElement, engine, tools);

        const sketches = await MyIndexedDb.getAll('sketches');
        if (sketches.length === 0) {
            const initialSketch = {
                id: Date.now(),
                name: "Welcome Sketch 01",
                lines: []
            };
            await MyIndexedDb.set('sketches', initialSketch);
        }

        const ui = new UiManager(engine);
        await ui.renderSketchList();

        const toggleBtn = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');

        toggleBtn.onclick = () => {
            sidebar.classList.toggle('collapsed');
            toggleBtn.innerText = sidebar.classList.contains('collapsed') ? '⟩' : '⟨';
            setTimeout(() => engine.resizeCanvas(), 300);
        };

        const addSketchBtn = document.getElementById('btn-add-sketch');
        addSketchBtn.onclick = async () => {
            const name = prompt("Enter new sketch name:", `My Sketch ${Date.now().toString().slice(-4)}`);
            if (!name || name.trim() === "") return;

            const newSketch = {
                id: Date.now(),
                name: name.trim(),
                lines: []
            };

            await MyIndexedDb.set('sketches', newSketch);
            await ui.renderSketchList();
        };

    } catch (error) {
        console.error("Failed to initialize the application pipeline core:", error);
    }
});

export class DocumentSettings extends Observable implements IEditable {
    private editors: Record<string, string> = {};

    constructor(data: { fg: string; bg: string; stroke: number }) {
        super(data);

        this.editors['bg'] = 'color';
        this.editors['fg'] = 'color';
        this.editors['stroke'] = 'thickness';
    }

    getEditor(propertyName: string): string {
        return this.editors[propertyName];
    }
}