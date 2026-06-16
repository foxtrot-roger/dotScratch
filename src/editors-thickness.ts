import { IEditor, IObserver, BindingTwoWay } from "./bindings";

export class ThicknessFromSlider implements IEditor {
    public input: HTMLInputElement;
    private bindings: IObserver[] = [];

    constructor(min = 1, max = 20, step = 1) {
        this.input = document.createElement('input');
        this.input.type = 'range';
        this.input.min = min.toString();
        this.input.max = max.toString();
        this.input.step = step.toString();
        this.input.style.width = '150px';

        this.input.addEventListener('input', () => {
            Promise.all(this.bindings.map(b => b.onPropertyChanged(this, 'value')))
                .catch(err => console.error("Failed to notify bindings:", err));
        });
    }

    set(propertyName: string, value: any): void {
        if (propertyName === 'value') {
            const numericValue = value?.toString() ?? this.input.min;
            if (this.input.value !== numericValue) {
                this.input.value = numericValue;

                Promise.all(this.bindings.map(b => b.onPropertyChanged(this, 'value')))
                    .catch(err => console.error("Failed to notify bindings:", err));
            }
        }
    }
    get(propertyName: string): any {
        return propertyName === 'value' ? Number(this.input.value) : undefined;
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
export class ThicknessFromPalette implements IEditor {
    public input: HTMLElement;

    private sizes: number[] = [];
    private bindings: IObserver[] = [];
    private value: number | null = null;

    constructor() {
        this.input = document.createElement('div');
        this.input.classList.add("palette-thickness");
    }

    setThicknesses(sizes: number[]): void {
        this.sizes = sizes;
        this.redraw();
    }

    set(propertyName: string, value: any): void {
        if (propertyName === 'value' && this.value !== value) {
            this.value = value != null ? Number(value) : null;
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

        this.sizes.forEach(size => {
            const swatch = document.createElement('div');
            swatch.classList.add("palette-swatch");

            const dot = document.createElement('div');
            dot.style.backgroundColor = 'black';
            dot.style.borderRadius = '50%';
            dot.style.width = `${size}px`;
            dot.style.height = `${size}px`;
            
            swatch.appendChild(dot);

            if (size === this.value) {
                swatch.classList.add("active");
            }

            swatch.addEventListener('click', () => {
                this.value = size;
                this.redraw();

                Promise.all(this.bindings.map(b => b.onPropertyChanged(this, 'value')))
                    .catch(err => console.error("Failed to notify bindings:", err));
            });

            this.input.appendChild(swatch);
        });
    }
}
export class ThicknessEditor implements IEditor {
    public input: HTMLDivElement;
    private slider: ThicknessFromSlider;
    private palette: ThicknessFromPalette;
    private bindings: IObserver[] = [];
    private internalBindings: BindingTwoWay[] = [];
    private value: number = 1;

    constructor() {
        this.input = document.createElement('div');
        this.input.style.display = 'flex';
        this.input.style.flexDirection = 'column';
        this.input.style.gap = '15px';
        this.input.style.width = 'fit-content';

        this.palette = new ThicknessFromPalette();
        this.input.appendChild(this.palette.input);

        this.slider = new ThicknessFromSlider(1, 20, 1);
        this.input.appendChild(this.slider.input);

        this.setupInternalBindings();
    }

    private setupInternalBindings(): void {
        this.internalBindings = [
            new BindingTwoWay(this, 'value', this.palette, 'value'),
            new BindingTwoWay(this, 'value', this.slider, 'value'),
        ];

        this.internalBindings.forEach(binding => binding.bind());
    }

    setThicknesses(sizes: number[]): void {
        this.palette.setThicknesses(sizes);
    }

    set(propertyName: string, value: any): void {
        if (propertyName === 'value' && this.value !== value) {
            this.value = value != null ? Number(value) : 1;

            // Broadcast changes to external application-level bindings
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