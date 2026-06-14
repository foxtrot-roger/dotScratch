export interface IObserver {
    onPropertyChanged(instance: IObservable, propertyName: string): Promise<void>;
}
export interface IObservable {
    set(propertyName: string, value: any): void;
    get(propertyName: string): any;
    bind(binding: IObserver): void;
    unbind(binding: IObserver): void;
}

export class Observable implements IObservable {
    private bindings: IObserver[] = [];
    constructor(private instance: any) { }

    set(propertyName: string, value: any): void {
        this.instance[propertyName] = value;

        Promise
            .all(this.bindings.map(editor => editor.onPropertyChanged(this, propertyName)))
            .catch(err => console.error("Failed to refresh one or more editors:", err));
    }
    get(propertyName: string): any {
        return this.instance[propertyName];
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

export class BindingTwoWay {
    private sourceBinding: BindingOneWay;
    private targetBinding: BindingOneWay;

    constructor(public source: IObservable, public sourceProperty: string, public target: IObservable, public targetProperty: string) {
        this.sourceBinding = new BindingOneWay(source, sourceProperty, target, targetProperty);
        this.targetBinding = new BindingOneWay(target, targetProperty, source, sourceProperty);
    }

    bind(): void {
        this.sourceBinding.bind();
        this.targetBinding.bind();
    }
    unbind(): void {
        this.sourceBinding.unbind();
        this.targetBinding.unbind();
    }
}
export class BindingOneWay implements IObserver {
    constructor(public source: IObservable, public sourceProperty: string, public target: IObservable, public targetProperty: string) { }

    async onPropertyChanged(instance: IObservable, propertyName: string): Promise<void> {
        if (instance === this.source && propertyName === this.sourceProperty) {
            const newValue = this.source.get(this.sourceProperty);

            if (this.target.get(this.targetProperty) !== newValue) {
                this.target.set(this.targetProperty, newValue);
            }
        }
    }

    bind(): void {
        this.source.bind(this);

        const initialValue = this.source.get(this.sourceProperty);
        this.target.set(this.targetProperty, initialValue);
    }
    unbind(): void {
        this.source.unbind(this);
    }
}

export interface IEditor extends IObservable {
    input: HTMLElement;
}
export interface IEditable extends IObservable {
    getEditor(propertyName): string;
}

export class Editable extends Observable implements IEditable {
    private editors: Record<string, string> = {};

    constructor(instance: any) {
        super(instance);
    }

    getEditor(propertyName: string): string {
        return this.editors[propertyName];
    }
    setEditor(propertyName: string, editor: string): void {
        this.editors[propertyName] = editor;
    }
}