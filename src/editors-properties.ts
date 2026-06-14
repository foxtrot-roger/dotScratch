import { BindingTwoWay, IEditable, IEditor } from "./bindings";
import { ColorEditor, ColorFromHex, ColorFromPalette } from "./editors-color"
import { ThicknessEditor, ThicknessFromSlider, ThicknessFromPalette } from "./editors-thickness"

export class FullPropertyEditor {
    public input: HTMLElement;
    private activeBindings: BindingTwoWay[] = [];

    constructor() {
        this.input = document.createElement('div');
        this.input.classList.add("tool-fulledit");
    }

    edit(instance: IEditable): void {
        this.activeBindings.map(b => b.unbind());
        this.activeBindings = [];

        this.input.innerHTML = '';

        const rawData = (instance as any).instance || {};
        const propertyNames = Object.keys(rawData);

        propertyNames.map(propertyName => {
            const editorKey = instance.getEditor(propertyName);
            if (!editorKey) return;

            const editor = this.createEditor(editorKey);
            if (!editor) return;

            const property = document.createElement('div');
            property.classList.add("property-editor");
            this.input.appendChild(property);

            const label = document.createElement('label');
            label.innerText = propertyName;
            property.appendChild(label);

            property.appendChild(editor.input);

            const binding = new BindingTwoWay(instance, propertyName, editor, 'value');
            this.activeBindings.push(binding);
            binding.bind();
        });
    }

    createEditor(key: string): IEditor {
        if (key === 'color') {
            const editor = new ColorEditor();

            const palette = [
                // --- Grayscale Foundation (Black to White) ---
                '#1e293b', // 1. Deep Slate / Ink (Primary text color)
                '#64748b', // 2. Muted Gray (Secondary text, dates, minor details)
                '#cbd5e1', // 3. Light Gray (Dividers, borders, unselected states)
                '#f8fafc', // 4. Off-White (Page background, clean contrast)

                // --- Warm Tones (Urgency & Highlights) ---
                '#ff6b6b', // 5. Coral Red (Critical info, mistakes, action items)
                '#f4a261', // 6. Soft Orange (Important sub-points, deadlines)
                '#ffd166', // 7. Pastel Yellow (Classic core text highlighter)
                '#f3c68f', // 8. Warm Desert / Tan (Context, historical dates)

                // --- Cool Tones (Structure & Categories) ---
                '#06d6a0', // 9. Mint Green (Definitions, examples, completed tasks)
                '#4ea8de', // 10. Sky Blue (Headers, new chapters, themes)
                '#560bad', // 11. Deep Violet (Main structural categories, formulas)
                '#b5179e', // 12. Bright Magenta (Vocabulary words, vocabulary keys)

                // --- Earth & Accent Tones (Nuance & Grouping) ---
                '#2a9d8f', // 13. Deep Teal (Code snippets, quotes, external references)
                '#a8dadc', // 14. Soft Sage (Secondary highlighter for dense blocks)
                '#e29578', // 15. Terracotta (Cross-references, index matching)
                '#eddcd2'  // 16. Almond (Muted background callouts, blockquotes)
            ];
            editor.setPalette(palette);

            return editor;
        }
        else if (key === 'thickness') {
            const editor = new ThicknessEditor();

            const thicknesses = [2, 5, 10, 20];
            editor.setThicknesses(thicknesses);

            return editor;
        }

        return null;
    }
}
export class QuickPropertyEditor {
    public input: HTMLElement;
    private activeBindings: BindingTwoWay[] = [];

    constructor() {
        this.input = document.createElement('div');
        this.input.classList.add("tool-quickedit");
    }

    edit(instance: IEditable): void {
        this.activeBindings.map(b => b.unbind());
        this.activeBindings = [];

        this.input.innerHTML = '';

        const rawData = (instance as any).instance || {};
        const propertyNames = Object.keys(rawData);

        propertyNames.map(propertyName => {
            const editorKey = instance.getEditor(propertyName);
            if (!editorKey) return;

            const editor = this.createEditor(editorKey);
            if (!editor) return;

            const property = document.createElement('div');
            property.classList.add("property-editor");
            this.input.appendChild(property);

            property.appendChild(editor.input);

            const binding = new BindingTwoWay(instance, propertyName, editor, 'value');
            this.activeBindings.push(binding);
            binding.bind();
        });
    }

    createEditor(key: string): IEditor {
        if (key === 'color') {
            const editor = new ColorFromPalette();

            const palette = ['#ff0000', '#00ff00', '#0000ff'];
            editor.setPalette(palette);

            return editor;
        }
        else if (key === 'thickness') {
            const editor = new ThicknessFromPalette();

            const thicknesses = [2, 5, 10, 20];
            editor.setThicknesses(thicknesses);

            return editor;
        }

        return null;
    }
}