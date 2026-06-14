import { MyIndexedDb } from './MyIndexedDb';
import { SketchCanvas } from './MyCanvas';

export interface DbColor {
    color: string;
}

export class ColorManager {
    private canvasEngine: SketchCanvas;
    public selectedColor: string = '#000000';
    private activeDropdownId: string | null = null;

    constructor(canvasEngine: SketchCanvas) {
        this.canvasEngine = canvasEngine;
        this.selectedColor = canvasEngine.selectedColor;

        this.initGlobalClickWatcher();
    }

    private setColor(value: string): void {
        this.selectedColor = value;
        this.canvasEngine.selectedColor = value;
        this.canvasEngine.isEraserMode = false;
    }

    public async renderControls(): Promise<void> {
        const colorsContainer = document.getElementById('colors-container');
        if (!colorsContainer) return;

        const colors = await MyIndexedDb.getAll('colors') as DbColor[];
        colorsContainer.innerHTML = '';

        // Add Button
        const addCWrapper = document.createElement('div');
        addCWrapper.style.position = 'relative';
        addCWrapper.style.display = 'inline-block';

        const addCBtn = document.createElement('button');
        addCBtn.className = 'thickness-btn';
        addCBtn.innerText = '+';
        addCBtn.style.padding = '2px 8px';

        addCBtn.onclick = (e) => {
            e.stopPropagation();
            this.activeDropdownId = this.activeDropdownId === 'add' ? null : 'add';
            this.renderControls();
        };

        addCWrapper.appendChild(addCBtn);

        if (this.activeDropdownId === 'add') {
            const addDropdown = this.createAddColorDropdown();
            colorsContainer.appendChild(addDropdown);
        }
        colorsContainer.appendChild(addCWrapper);

        colors.forEach((c: DbColor) => {
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.display = 'inline-block';

            const swatch = document.createElement('div');
            swatch.className = `color-swatch ${c.color === this.selectedColor ? 'active' : ''}`;
            swatch.style.backgroundColor = c.color;

            swatch.onclick = async (e) => {
                e.stopPropagation();
                if (this.selectedColor === c.color) {
                    this.activeDropdownId = this.activeDropdownId === c.color ? null : c.color;
                    this.renderControls();
                    return;
                }
                this.setColor(c.color);
                this.activeDropdownId = null;
                this.renderControls();
            };

            wrapper.appendChild(swatch);

            if (this.activeDropdownId === c.color) {
                const dropdown = this.createColorDropdown(c);
                colorsContainer.appendChild(dropdown);
            }
            colorsContainer.appendChild(wrapper);
        });
    }

    /**
     * Creates an embedded HSL color picker row + bidirectional Hex input field
     */
    private createCustomPickerUI(initialHex: string, onColorChange: (hex: string) => void): {
        uiContainer: HTMLDivElement;
        updateFromExternalHex: (hex: string) => void;
    } {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        container.style.width = '160px';

        // Convert incoming Hex to starting working HSL parameters
        let { h, s, l } = this.hexToHsl(initialHex);

        // Preview Box Block
        const preview = document.createElement('div');
        preview.style.height = '12px';
        preview.style.borderRadius = '4px';
        preview.style.backgroundColor = initialHex;
        preview.style.border = '1px solid #e0e4ec';

        // 1. Rainbow Hue Track Slider
        const hueSlider = document.createElement('input');
        hueSlider.type = 'range';
        hueSlider.min = '0';
        hueSlider.max = '360';
        hueSlider.value = String(h);
        hueSlider.style.width = '100%';
        hueSlider.style.cursor = 'pointer';
        hueSlider.style.webkitAppearance = 'none';
        hueSlider.style.height = '8px';
        hueSlider.style.borderRadius = '4px';
        hueSlider.style.background = 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)';

        // 2. Saturation/Lightness Fine-Tuner Slider
        const slSlider = document.createElement('input');
        slSlider.type = 'range';
        slSlider.min = '0';
        slSlider.max = '100';
        slSlider.value = '50'; // Starting baseline default placement layout tracking
        slSlider.style.width = '100%';
        slSlider.style.cursor = 'pointer';
        slSlider.style.webkitAppearance = 'none';
        slSlider.style.height = '8px';
        slSlider.style.borderRadius = '4px';

        // Custom calculation mapping to set SL position based on incoming brightness matrix
        const setSlSliderFromValue = (sVal: number, lVal: number) => {
            if (lVal <= 50) {
                slSlider.value = String((lVal / 50) * 50);
            } else {
                slSlider.value = String(50 + (((lVal - 50) / 50) * 50));
            }
        };
        setSlSliderFromValue(s, l);

        const updateSlTrackGradient = (currentHue: number) => {
            slSlider.style.background = `linear-gradient(to right, #000000 0%, hsl(${currentHue}, 100%, 50%) 50%, #ffffff 100%)`;
        };
        updateSlTrackGradient(h);

        // 3. Hex Editor Text Input
        const hexInput = document.createElement('input');
        hexInput.type = 'text';
        hexInput.value = initialHex;
        hexInput.style.width = '100%';
        hexInput.style.padding = '4px 6px';
        hexInput.style.borderRadius = '4px';
        hexInput.style.border = '1px solid #ccc';
        hexInput.style.fontSize = '12px';
        hexInput.style.fontFamily = 'monospace';
        hexInput.style.textAlign = 'center';

        const runSlidersUpdate = () => {
            h = Number(hueSlider.value);
            const slVal = Number(slSlider.value);

            if (slVal < 50) {
                s = 100;
                l = (slVal / 50) * 50;
            } else {
                s = 100 - (((slVal - 50) / 50) * 100);
                l = 50 + (((slVal - 50) / 50) * 50);
            }

            if (slVal === 0) { s = 0; l = 0; }
            if (slVal === 100) { s = 0; l = 100; }

            const hexResult = this.hslToHex(h, s, l);
            preview.style.backgroundColor = hexResult;
            hexInput.value = hexResult;
            updateSlTrackGradient(h);
            onColorChange(hexResult);
        };

        hueSlider.oninput = runSlidersUpdate;
        slSlider.oninput = runSlidersUpdate;

        hexInput.onchange = () => {
            let val = hexInput.value.trim();
            if (val.length === 6 && !val.startsWith('#')) {
                val = '#' + val;
                hexInput.value = val;
            }

            // Validate it's a valid 7-character hex code before breaking layout
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                preview.style.backgroundColor = val;
                const hsl = this.hexToHsl(val);
                h = hsl.h; s = hsl.s; l = hsl.l;

                hueSlider.value = String(h);
                setSlSliderFromValue(s, l);
                updateSlTrackGradient(h);
                onColorChange(val);
            } else {
                // If invalid, revert text field back to standard hex setting state
                hexInput.value = this.hslToHex(h, s, l);
            }
        };

        container.appendChild(preview);
        container.appendChild(hueSlider);
        container.appendChild(slSlider);
        container.appendChild(hexInput);

        return {
            uiContainer: container,
            updateFromExternalHex: (hex: string) => {
                hexInput.value = hex;
                preview.style.backgroundColor = hex;
                const hsl = this.hexToHsl(hex);
                h = hsl.h; s = hsl.s; l = hsl.l;
                hueSlider.value = String(h);
                setSlSliderFromValue(s, l);
                updateSlTrackGradient(h);
            }
        };
    }

    private createColorDropdown(item: DbColor): HTMLDivElement {
        const dropdown = this.createBaseDropdown();

        const pickerEngine = this.createCustomPickerUI(item.color, async (newColor) => {
            await MyIndexedDb.delete('colors', item.color);
            await MyIndexedDb.set('colors', { color: newColor });
            item.color = newColor;
            this.activeDropdownId = newColor;
            this.setColor(newColor);
        });

        const delBtn = document.createElement('button');
        delBtn.innerText = 'Delete';
        delBtn.className = 'thickness-btn';
        delBtn.style.color = '#d93025';
        delBtn.style.backgroundColor = '#ffeeee';
        delBtn.style.border = '1px solid #fadbd8';
        delBtn.style.marginTop = '4px';

        delBtn.onclick = async () => {
            await MyIndexedDb.delete('colors', item.color);
            if (this.selectedColor === item.color) {
                const remaining = await MyIndexedDb.getAll('colors') as DbColor[];
                this.setColor(remaining.length > 0 ? remaining[0].color : '#000000');
            }
            this.activeDropdownId = null;
            this.renderControls();
        };

        dropdown.appendChild(pickerEngine.uiContainer);
        dropdown.appendChild(delBtn);
        return dropdown;
    }

    private createAddColorDropdown(): HTMLDivElement {
        const dropdown = this.createBaseDropdown();
        let pendingColor = '#1a73e8';

        const pickerEngine = this.createCustomPickerUI(pendingColor, (newColor) => {
            pendingColor = newColor;
        });

        const addBtn = document.createElement('button');
        addBtn.innerText = 'Add';
        addBtn.className = 'btn-new-sketch';
        addBtn.style.padding = '8px 14px';
        addBtn.style.marginTop = '4px';

        addBtn.onclick = async () => {
            await MyIndexedDb.set('colors', { color: pendingColor });
            this.setColor(pendingColor);
            this.activeDropdownId = null;
            this.renderControls();
        };

        dropdown.appendChild(pickerEngine.uiContainer);
        dropdown.appendChild(addBtn);
        return dropdown;
    }

    private createBaseDropdown(): HTMLDivElement {
        const dropdown = document.createElement('div');
        dropdown.style.position = 'absolute';
        dropdown.style.top = '65px';
        dropdown.style.right = '12px';
        dropdown.style.backgroundColor = '#ffffff';
        dropdown.style.border = '1px solid #e0e4ec';
        dropdown.style.borderRadius = '8px';
        dropdown.style.padding = '12px';
        dropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        dropdown.style.display = 'flex';
        dropdown.style.flexDirection = 'column';
        dropdown.style.gap = '6px';
        dropdown.style.zIndex = '100';
        dropdown.onclick = (e) => e.stopPropagation();
        return dropdown;
    }

    // --- MATH UTILITIES FOR GRAPHICS CONVERSIONS ---
    private hexToHsl(hex: string): { h: number; s: number; l: number } {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) hex = hex.split('').map(s => s + s).join('');
        let r = parseInt(hex.substring(0, 2), 16) / 255;
        let g = parseInt(hex.substring(2, 4), 16) / 255;
        let b = parseInt(hex.substring(4, 6), 16) / 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    private hslToHex(h: number, s: number, l: number): string {
        s /= 100; l /= 100; h /= 360;
        let r = l, g = l, b = l;
        if (s !== 0) {
            const hue2rgb = (p: number, q: number, t: number) => {
                if (t < 0) t += 1; if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            let p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        const toHex = (x: number) => {
            const str = Math.round(x * 255).toString(16);
            return str.length === 1 ? '0' + str : str;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    private initGlobalClickWatcher(): void {
        document.addEventListener('pointerdown', (event: PointerEvent) => {
            if (this.activeDropdownId === null) return;
            const target = event.target as HTMLElement;
            if (!target.closest('#colors-container')) {
                this.activeDropdownId = null;
                this.renderControls();
            }
        });
    }
}