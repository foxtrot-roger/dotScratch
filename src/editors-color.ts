import { IEditor, IObserver, BindingTwoWay } from "./bindings";

export class ColorFromHex implements IEditor {
    public input: HTMLInputElement;
    private bindings: IObserver[] = [];

    constructor() {
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.placeholder = '#ffffff';
        this.input.style.fontFamily = 'monospace';
        this.input.style.padding = '4px 8px';

        this.input.addEventListener('input', () => {
            Promise.all(this.bindings.map(b => b.onPropertyChanged(this, 'value')))
                .catch(err => console.error("Failed to notify bindings:", err));
        });
    }

    set(propertyName: string, value: any): void {
        if (propertyName === 'value' && this.input.value !== value) {
            this.input.value = value ?? '';

            Promise.all(this.bindings.map(b => b.onPropertyChanged(this, 'value')))
                .catch(err => console.error("Failed to notify bindings:", err));
        }
    }
    get(propertyName: string): any {
        return propertyName === 'value' ? this.input.value : undefined;
    }
    bind(binding: IObserver): void {
        if (!this.bindings.includes(binding)) {
            this.bindings.push(binding);
        }
    }
    unbind(binding: IObserver): void {
        this.bindings = this.bindings.filter(b => b !== binding);
    }
}
export class ColorFromPalette implements IEditor {
    public input: HTMLElement;

    private palette: string[] = [];
    private bindings: IObserver[] = [];
    private value: string | null = null;

    constructor() {
        this.input = document.createElement('div');
        this.input.classList.add("palette-color");
    }

    setPalette(colors: string[]) {
        this.palette = colors;
        this.redraw();
    }

    set(propertyName: string, value: any): void {
        if (propertyName === 'value' && this.value !== value) {
            this.value = value ?? null;
            this.redraw();

            Promise.all(this.bindings.map(b => b.onPropertyChanged(this, 'value')))
                .catch(err => console.error("Failed to notify bindings:", err));
        }
    }
    get(propertyName: string): any {
        return propertyName === 'value' ? this.value : undefined;
    }
    bind(binding: IObserver): void {
        if (!this.bindings.includes(binding)) {
            this.bindings.push(binding);
        }
    }
    unbind(binding: IObserver): void {
        this.bindings = this.bindings.filter(b => b !== binding);
    }

    redraw(): void {
        this.input.innerHTML = '';

        this.palette.forEach(color => {
            const swatch = document.createElement('div');
            swatch.classList.add("palette-swatch");

            swatch.style.backgroundColor = color;

            if (color === this.value) {
                swatch.classList.add("active");
            }

            swatch.addEventListener('click', () => {
                this.value = color;
                this.redraw();

                Promise.all(this.bindings.map(b => b.onPropertyChanged(this, 'value')))
                    .catch(err => console.error("Failed to notify bindings:", err));
            });

            this.input.appendChild(swatch);
        });
    }
}
export class ColorEditor implements IEditor {
    private hex: ColorFromHex;
    private palette: ColorFromPalette;
    public input: HTMLDivElement;
    private bindings: IObserver[] = [];
    private internalBindings: BindingTwoWay[] = [];
    private value: string = '';

    constructor() {
        this.input = document.createElement('div');
        this.input.style.display = 'flex';
        this.input.style.flexDirection = 'column';
        this.input.style.gap = '10px';
        this.input.style.width = 'fit-content';

        this.palette = new ColorFromPalette();
        this.hex = new ColorFromHex();

        this.input.appendChild(this.palette.input);
        this.input.appendChild(this.hex.input);

        this.setupInternalBindings();
    }

    private setupInternalBindings(): void {
        this.internalBindings = [
            new BindingTwoWay(this, 'value', this.palette, 'value'),
            new BindingTwoWay(this, 'value', this.hex, 'value'),
        ];

        this.internalBindings.forEach(binding => binding.bind());
    }

    setPalette(colors: string[]): void {
        this.palette.setPalette(colors);
    }

    set(propertyName: string, value: any): void {
        if (propertyName === 'value' && this.value !== value) {
            this.value = value ?? '';

            Promise.all(this.bindings.map(b => b.onPropertyChanged(this, 'value')))
                .catch(err => console.error("Failed to notify external bindings:", err));
        }
    }
    get(propertyName: string): any {
        return propertyName === 'value' ? this.value : undefined;
    }
    bind(binding: IObserver): void {
        if (!this.bindings.includes(binding)) {
            this.bindings.push(binding);
        }
    }
    unbind(binding: IObserver): void {
        this.bindings = this.bindings.filter(b => b !== binding);
    }
}