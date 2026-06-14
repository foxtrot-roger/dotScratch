import { MyIndexedDb } from '../MyIndexedDb';
import { SketchCanvas } from '../MyCanvas';

export interface DbThickness {
	thickness: number;
	last_used: number;
}

export class ThicknessManager {
	private canvasEngine: SketchCanvas;
	public selectedThickness: number = 2;
	private activeDropdownId: number | string | null = null;
	public maxThickness: number = 200;

	constructor(canvasEngine: SketchCanvas) {
		this.canvasEngine = canvasEngine;
		this.selectedThickness = canvasEngine.selectedThickness;

		this.initGlobalClickWatcher();
	}

	private setThickness(value: number): void {
		this.selectedThickness = value;
		this.canvasEngine.selectedThickness = value;
	}

	public async renderControls(): Promise<void> {
		// --- 1. THICKNESS MANAGEMENT ---
		const thicknessContainer = document.getElementById('thickness-container');
		if (!thicknessContainer) return;

		const thicknesses = await MyIndexedDb.getAll('thicknesses') as DbThickness[];
		thicknessContainer.innerHTML = '';

		// Sort items incrementally 
		thicknesses.sort((a, b) => a.thickness - b.thickness).forEach((t: DbThickness) => {
			// Container to wrap the button and its potential dropdown cleanly
			const wrapper = document.createElement('div');
			wrapper.style.position = 'relative';
			wrapper.style.display = 'inline-block';

			const btn = document.createElement('button');
			btn.className = `thickness-btn ${t.thickness === this.selectedThickness ? 'active' : ''}`;
			btn.innerText = `${t.thickness}px`;

			btn.onclick = async (e) => {
				e.stopPropagation();

				// Case A: Clicked on an already active thickness -> Toggle its edit dropdown menu
				if (this.selectedThickness === t.thickness) {
					this.activeDropdownId = this.activeDropdownId === t.thickness ? null : t.thickness;
					this.renderControls(); // Re-render to mount or unmount the dropdown card
					return;
				}

				// Case B: Clicked a different thickness -> Just change active selection and close any open dropmenus
				this.setThickness(t.thickness);
				this.activeDropdownId = null;
				this.renderControls();
			};

			wrapper.appendChild(btn);

			// Mount the custom dropdown settings pane if this item is selected and open
			if (this.activeDropdownId === t.thickness) {
				const dropdown = this.createThicknessDropdown(t);
				thicknessContainer.appendChild(dropdown);
			}

			thicknessContainer.appendChild(wrapper);
		});

		// Add Thickness Button (+) Placeholder
		const addTBtn = document.createElement('button');
		addTBtn.className = `thickness-btn`;
		addTBtn.innerText = '+';

		addTBtn.onclick = (e) => {
			e.stopPropagation();
			// Toggle the "add" menu view. If it's already open, close it.
			this.activeDropdownId = this.activeDropdownId === 'add' ? null : 'add';
			this.renderControls();
		};

		// If the active dropdown state is 'add', mount the creation panel right here
		if (this.activeDropdownId === 'add') {
			const addDropdown = this.createAddThicknessDropdown();
			thicknessContainer.appendChild(addDropdown);
		}

		thicknessContainer.appendChild(addTBtn);
	}

	private createBaseDropdown(): HTMLDivElement {
		const dropdown = document.createElement('div');

		dropdown.style.position = 'absolute';
		dropdown.style.top = '65px';
		dropdown.style.left = '12px';
		dropdown.style.backgroundColor = '#ffffff';
		dropdown.style.border = '1px solid #e0e4ec';
		dropdown.style.borderRadius = '8px';
		dropdown.style.padding = '12px';
		dropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
		dropdown.style.display = 'flex';
		dropdown.style.alignItems = 'center';
		dropdown.style.gap = '8px';
		dropdown.style.zIndex = '100';

		dropdown.onclick = (e) => e.stopPropagation();

		return dropdown;
	}

	private createAddThicknessDropdown(): HTMLDivElement {
		const dropdown = this.createBaseDropdown();

		// 1. Slider Component
		const slider = document.createElement('input');
		slider.type = 'range';
		slider.min = '1';
		slider.max = `${this.maxThickness}`;
		slider.value = String(0);
		slider.style.cursor = 'pointer';

		// 2. Value Input Field (Right side text/number box)
		const numInput = document.createElement('input');
		numInput.type = 'number';
		numInput.min = '1';
		numInput.max = '100';
		numInput.value = '5'; // Sensible starting fallback placeholder
		numInput.style.width = '60px';
		numInput.style.padding = '6px';
		numInput.style.borderRadius = '4px';
		numInput.style.border = '1px solid #ccc';
		numInput.style.fontSize = '14px';

		// 2. Add Action Confirmation Button
		const addBtn = document.createElement('button');
		addBtn.innerText = 'Add';
		addBtn.style.backgroundColor = '#1a73e8';
		addBtn.style.color = '#ffffff';
		addBtn.style.border = 'none';
		addBtn.style.padding = '6px 12px';
		addBtn.style.borderRadius = '4px';
		addBtn.style.cursor = 'pointer';
		addBtn.style.fontSize = '13px';
		addBtn.style.fontWeight = '500';

		// Shared execution logic when submitting a new number
		const submitNewThickness = async () => {
			const val = Number(numInput.value);
			if (val && !isNaN(val) && val > 0) {
				const newThickness = Math.round(val);

				// Persist value inside local storage schemas
				await MyIndexedDb.set('thicknesses', { thickness: newThickness });

				// Instantly activate it on the canvas workspace viewport context
				this.setThickness(newThickness);

				// Clean dropdown focus state flags & repaint matching controls rows
				this.activeDropdownId = null;
				this.renderControls();
			}
		};

		slider.oninput = () => {
			numInput.value = slider.value;
		};

		numInput.onchange = () => {
			let val = Math.max(1, Math.min(100, Number(numInput.value)));
			slider.value = String(val);
		};

		// Trigger action on click or on pressing the "Enter" key inside the input
		addBtn.onclick = submitNewThickness;
		numInput.onkeydown = (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				submitNewThickness();
			}
		};

		dropdown.appendChild(slider);
		dropdown.appendChild(numInput);
		dropdown.appendChild(addBtn);

		// Auto-focus the input text area the second it mounts to the screen
		setTimeout(() => numInput.select(), 10);

		return dropdown;
	}
	private createThicknessDropdown(item: DbThickness): HTMLDivElement {
		const dropdown = this.createBaseDropdown();

		// 1. Slider Component
		const slider = document.createElement('input');
		slider.type = 'range';
		slider.min = '1';
		slider.max = `${this.maxThickness}`;
		slider.value = String(item.thickness);
		slider.style.cursor = 'pointer';

		// 2. Value Input Field (Right side text/number box)
		const numInput = document.createElement('input');
		numInput.type = 'number';
		numInput.min = '1';
		numInput.max = '100';
		numInput.value = String(item.thickness);
		numInput.style.width = '50px';
		numInput.style.padding = '4px';
		numInput.style.borderRadius = '4px';
		numInput.style.border = '1px solid #ccc';

		// Shared live-update routine when updating slider or input box
		const updateThicknessValue = async (newVal: number) => {
			if (newVal < 1 || isNaN(newVal)) return;

			// Delete old index reference, insert updated key entry
			await MyIndexedDb.delete('thicknesses', item.thickness);
			await MyIndexedDb.set('thicknesses', { thickness: newVal });

			// Map settings down directly to active environment pointers
			item.thickness = newVal;
			this.activeDropdownId = newVal;
			this.setThickness(newVal);
		};

		slider.oninput = () => {
			numInput.value = slider.value;
			updateThicknessValue(Number(slider.value));
		};

		numInput.onchange = () => {
			let val = Math.max(1, Math.min(100, Number(numInput.value)));
			slider.value = String(val);
			updateThicknessValue(val);
		};


		// 3. Delete Action Button
		const delBtn = document.createElement('button');
		delBtn.innerText = 'Delete';
		delBtn.style.backgroundColor = '#ffeeee';
		delBtn.style.color = '#d93025';
		delBtn.style.border = '1px solid #fadbd8';
		delBtn.style.padding = '4px 8px';
		delBtn.style.borderRadius = '4px';
		delBtn.style.cursor = 'pointer';
		delBtn.style.fontSize = '12px';
		delBtn.style.fontWeight = '500';

		delBtn.onclick = async () => {
			await MyIndexedDb.delete('thicknesses', item.thickness);

			// If the deleted option was selected, find the closest substitute alternative option
			if (this.selectedThickness === item.thickness) {
				const remaining = await MyIndexedDb.getAll('thicknesses') as DbThickness[];
				if (remaining.length > 0) {
					this.setThickness(remaining[0].thickness);
				}
			}

			this.activeDropdownId = null; // Close menu panel context
			this.renderControls();
		};

		// Document Fragment Assembler
		dropdown.appendChild(slider);
		dropdown.appendChild(numInput);
		dropdown.appendChild(delBtn);

		return dropdown;
	}

	private initGlobalClickWatcher(): void {
		document.addEventListener('pointerdown', (event: MouseEvent) => {
			// If no menu overlay context is open, do nothing
			if (this.activeDropdownId === null) return;

			const target = event.target as HTMLElement;

			// Check if the click originated from inside a thickness element wrapper
			const clickedInsideThicknessRow = target.closest('#thickness-container');

			if (!clickedInsideThicknessRow) {
				this.activeDropdownId = null;
				this.renderControls(); // Redraw UI to collapse the dropdown safely
			}
		});
	}
}