import { IEditor, IObserver } from './bindings';

export interface ListViewConfig<T> {
    getName: (item: T) => string;
    onSelectionChange?: (item: T) => void;
    onRename?: (item: T) => void;
    onDelete?: (item: T) => void;
}

export class ListView<T> implements IEditor {
    public readonly input: HTMLElement;

    private config: ListViewConfig<T>;
    private bindings: IObserver[] = [];

    private _value: T | null = null;
    private items: T[] = [];

    constructor(config: ListViewConfig<T>) {
        this.config = config;
        this.input = document.createElement('div');
        this.input.classList.add("sketch-list");
    }

    public get value(): T | null {
        return this._value;
    }
    public set value(newValue: T | null) {
        if (this._value !== newValue) {
            this._value = newValue;
            this.redraw();
            this.notifyBindings();

            if (this.config.onSelectionChange) {
                this.config.onSelectionChange(newValue);
            }
        }
    }

    public setItems(items: T[]): void {
        this.items = [...items].sort((a, b) => {
            const nameA = this.config.getName(a);
            const nameB = this.config.getName(b);
            return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
        });

        this.redraw();
    }

    // IEditor Interface Implementation
    public set(propertyName: string, value: any): void {
        if (propertyName === 'value') {
            this.value = value ?? null;
        }
    }

    public get(propertyName: string): any {
        return propertyName === 'value' ? this.value : undefined;
    }

    public bind(binding: IObserver): void {
        if (!this.bindings.includes(binding)) {
            this.bindings.push(binding);
        }
    }

    public unbind(binding: IObserver): void {
        this.bindings = this.bindings.filter(b => b !== binding);
    }

    public redraw(): void {
        this.input.innerHTML = '';

        this.items.forEach((item) => {
            const itemName = this.config.getName(item);

            const div = document.createElement('div');
            div.classList.add("sketch-item");
            div.innerText = itemName;
            div.title = itemName;

            if (this._value === item) {
                div.classList.add("active");
            }

            div.addEventListener('click', () => {
                this.value = item;
            });

            this.input.appendChild(div);
        });
    }

    private notifyBindings(): void {
        Promise.all(this.bindings.map(b => b.onPropertyChanged(this, 'value')))
            .catch(err => console.error("Failed to notify bindings:", err));
    }
}