import { MyIndexedDb } from './MyIndexedDb';
import { SketchCanvas, SketchData } from './MyCanvas';

export class UiManager {
    private canvasEngine: SketchCanvas;

    // Tracking active properties locally inside the UI context
    public selectedThickness: number = 2;
    public selectedColor: string = '#000000';

    constructor(canvasEngine: SketchCanvas) {
        this.canvasEngine = canvasEngine;

        // Sync initial defaults directly with the canvas engine properties
        this.selectedThickness = canvasEngine.selectedThickness;
        this.selectedColor = canvasEngine.selectedColor;
    }

    // --- 3. SKETCH ARCHIVE DOCUMENT LIST MANAGEMENT ---
    public async renderSketchList(): Promise<void> {
        const listContainer = document.getElementById('sketch-list');
        if (!listContainer) return;

        const sketches = await MyIndexedDb.getAll('sketches') as SketchData[];

        // Sort alphabetically (case-insensitive)
        sketches.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

        listContainer.innerHTML = '';
        const currentSketch = this.canvasEngine.currentSketchData as unknown as SketchData;

        sketches.forEach((s: SketchData) => {
            const item = document.createElement('div');
            item.className = `sketch-item ${currentSketch && currentSketch.id === s.id ? 'active' : ''}`;
            item.innerText = s.name;
            item.title = s.name;

            // 1. Single Click: Load Sketch
            item.onclick = async () => {
                const updatedSketch = await MyIndexedDb.get('sketches', s.id);
                if (updatedSketch) {
                    this.canvasEngine.loadSketchData(updatedSketch);
                    // Assuming you have a standard viewport view reset built into your framework:
                    // this.canvasEngine.resetView(); 
                }
                document.querySelectorAll('.sketch-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            };

            // 2. Double Click: Rename Sketch
            item.ondblclick = async (e: MouseEvent) => {
                e.stopPropagation(); // Prevents firing single-click loading matrix pipeline twice
                const newName = prompt("Rename sketch:", s.name);
                if (!newName || newName.trim() === "" || newName.trim() === s.name) return;

                s.name = newName.trim();
                await MyIndexedDb.set('sketches', s);
                await this.renderSketchList();
            };

            // 3. Right Click: Delete Sketch
            item.oncontextmenu = async (e: MouseEvent) => {
                e.preventDefault();

                if (confirm(`Are you sure you want to delete "${s.name}"?`)) {
                    await MyIndexedDb.delete('sketches', s.id);

                    const activeSketch = this.canvasEngine.currentSketchData as unknown as SketchData;
                    if (activeSketch && activeSketch.id === s.id) {
                        const remaining = await MyIndexedDb.getAll('sketches') as SketchData[];
                        if (remaining.length > 0) {
                            this.canvasEngine.loadSketchData(remaining[0]);
                        } else {
                            this.canvasEngine.loadSketchData(null);
                        }
                    }

                    await this.renderSketchList();
                }
            };

            listContainer.appendChild(item);
        });
    }
}