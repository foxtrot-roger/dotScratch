import { SketchCanvas, ITool } from "./MyCanvas";
import { FullPropertyEditor, QuickPropertyEditor } from './editors-properties';

export class ToolBarManager {
    private canvasInstance: SketchCanvas;
    private toolsList: ITool[];
    private topBarElement: HTMLElement;

    private quickOptionsContainer!: HTMLDivElement;
    private fullConfigDropdownPanel!: HTMLDivElement;
    private toolsContainer!: HTMLDivElement;

    private fullPropertyEditor: FullPropertyEditor;
    private quickPropertyEditor: QuickPropertyEditor;

    constructor(topBarSelector: string, canvas: SketchCanvas, tools: ITool[]) {
        const element = document.querySelector(topBarSelector);
        if (!element) {
            throw new Error(`Could not find top bar container using selector: ${topBarSelector}`);
        }
        this.topBarElement = element as HTMLElement;
        this.canvasInstance = canvas;
        this.toolsList = tools;

        // Instantiate our single reusable editor instances
        this.fullPropertyEditor = new FullPropertyEditor();
        this.quickPropertyEditor = new QuickPropertyEditor();

        this.initStructure();
        this.updatePropertyEditors();
        this.setupGlobalCloseListeners();
    }

    private initStructure(): void {
        this.topBarElement.innerHTML = '';
        this.topBarElement.style.display = 'flex';
        this.topBarElement.style.alignItems = 'center';
        this.topBarElement.style.gap = '15px';
        this.topBarElement.style.padding = '6px 12px';
        this.topBarElement.style.backgroundColor = '#ffffff';
        this.topBarElement.style.borderBottom = '1px solid #e2e8f0';
        this.topBarElement.style.position = 'relative';

        // 1. Tool selection rail
        this.toolsContainer = document.createElement('div');
        this.toolsContainer.style.display = 'flex';
        this.toolsContainer.style.gap = '6px';
        this.topBarElement.appendChild(this.toolsContainer);

        this.toolsList.forEach((tool: ITool) => {
            const selector = this.renderToolButton(tool, tool === this.canvasInstance.activeTool);
            this.toolsContainer.appendChild(selector);
        });

        // 2. Inline visible Quick Controls container
        this.quickOptionsContainer = document.createElement('div');
        this.quickOptionsContainer.style.display = 'flex';
        this.quickOptionsContainer.style.alignItems = 'center';
        this.quickOptionsContainer.style.gap = '12px';
        // Append the quick editor's main input wrapper element permanently
        this.quickOptionsContainer.appendChild(this.quickPropertyEditor.input);
        this.topBarElement.appendChild(this.quickOptionsContainer);

        // 3. Absolute contextual details popover box 
        this.fullConfigDropdownPanel = document.createElement('div');
        this.fullConfigDropdownPanel.style.display = 'none';
        this.fullConfigDropdownPanel.style.position = 'absolute';
        this.fullConfigDropdownPanel.style.backgroundColor = '#ffffff';
        this.fullConfigDropdownPanel.style.border = '1px solid #cbd5e1';
        this.fullConfigDropdownPanel.style.boxShadow = '0px 6px 16px rgba(0,0,0,0.12)';
        this.fullConfigDropdownPanel.style.borderRadius = '6px';
        this.fullConfigDropdownPanel.style.padding = '14px';
        this.fullConfigDropdownPanel.style.minWidth = '260px';
        this.fullConfigDropdownPanel.style.zIndex = '2000';
        // Append the full editor's main input wrapper element permanently
        this.fullConfigDropdownPanel.appendChild(this.fullPropertyEditor.input);
        this.topBarElement.appendChild(this.fullConfigDropdownPanel);

        this.fullConfigDropdownPanel.addEventListener('click', (e) => e.stopPropagation());
    }

    private renderToolButton(tool: ITool, isSelected: boolean): HTMLElement {
        const item = document.createElement('div');
        item.style.width = "42px";
        item.style.height = "42px";
        item.style.cursor = 'pointer';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'center';
        item.style.borderRadius = '4px';
        item.className = isSelected ? "tool-btn active" : "tool-btn";
        item.innerHTML = `<span>${tool.icon}</span>`;

        item.addEventListener('click', (e) => {
            e.stopPropagation();

            if (this.canvasInstance.activeTool === tool) {
                const isShowing = this.fullConfigDropdownPanel.style.display === 'block';
                this.fullConfigDropdownPanel.style.display = isShowing ? 'none' : 'block';
                if (!isShowing) this.positionAndShowDropdown(item);
                return;
            }

            this.canvasInstance.activeTool = tool;

            if (item.parentElement) {
                item.parentElement.querySelectorAll('.tool-btn').forEach(node => {
                    node.classList.remove('active');
                });
            }
            item.classList.add('active');

            this.fullConfigDropdownPanel.style.display = 'none';

            // Switch targets and trigger auto-rerender pipeline via our components
            this.updatePropertyEditors();
        });

        return item;
    }

    // Handles orchestrating the structural shift when tools swap out
    private async updatePropertyEditors(): Promise<void> {
        const tool = this.canvasInstance.activeTool;
        if (!tool) return;

        // Simply tell our editors to mount and bind the new active tool context
        await Promise.all([
            this.quickPropertyEditor.edit(tool.editable),
            this.fullPropertyEditor.edit(tool.editable)
        ]);

        this.canvasInstance.renderCanvas();
    }

    private positionAndShowDropdown(anchorElement: HTMLElement): void {
        const rect = anchorElement.getBoundingClientRect();
        const parentRect = this.topBarElement.getBoundingClientRect();

        this.fullConfigDropdownPanel.style.left = `${rect.left - parentRect.left}px`;
        this.fullConfigDropdownPanel.style.top = `${rect.bottom - parentRect.top + 6}px`;
        this.fullConfigDropdownPanel.style.display = 'block';
    }

    private setupGlobalCloseListeners(): void {
        window.addEventListener('pointerdown', (e: PointerEvent) => {
            const target = e.target as HTMLElement;

            // Check if the click happened outside the dropdown panel
            if (this.fullConfigDropdownPanel && !this.fullConfigDropdownPanel.contains(target)) {
                this.fullConfigDropdownPanel.style.display = 'none';
            }
        });
    }
}