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

            const palette = ['#ff0000', '#00ff00', '#0000ff'];
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