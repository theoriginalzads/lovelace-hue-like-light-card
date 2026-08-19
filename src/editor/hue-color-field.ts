import { fireEvent } from 'custom-card-helpers';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Consts } from '../types/consts';

/**
 * Text field for entering a card color (name, hex, rgb()/rgba() or the special
 * 'warm'/'cold' keywords), paired with a native color-swatch picker for convenience.
 *
 * Optionally supports a dedicated 'theme color' toggle for fields backed by ColorExtended
 * (e.g. offColor, hueScreenBgColor), which recognize the special 'theme-color' sentinel value.
 */
@customElement('hue-color-field')
export class HueColorField extends LitElement {
    @property()
    public label = '';

    @property()
    public helper?: string;

    @property()
    public value = '';

    /** When set, shows a 'Use theme color' toggle that switches value to/from this exact sentinel value. */
    @property()
    public themeColorValue?: string;

    @property()
    public themeColorLabel = 'Use theme color';

    /** Value to fall back to when switching off theme-color mode. */
    @property()
    public fallbackValue = '';

    public static override styles = css`
    .row {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .theme-toggle {
        display: flex;
        align-items: center;
        margin-bottom: 4px;
    }
    ha-textfield {
        flex-grow: 1;
    }
    input[type="color"] {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        padding: 0;
        border: none;
        border-radius: 8px;
        background: none;
        cursor: pointer;
    }
    `;

    private get usingThemeColor(): boolean {
        return !!this.themeColorValue && this.value === this.themeColorValue;
    }

    protected override render() {
        return html`
        ${this.themeColorValue
        ? html`<div class="theme-toggle">
                <ha-formfield .label=${this.themeColorLabel}>
                    <ha-switch
                        .checked=${this.usingThemeColor}
                        @change=${this.onThemeToggle}
                    ></ha-switch>
                </ha-formfield>
            </div>`
        : nothing}
        ${this.usingThemeColor
        ? nothing
        : html`<div class="row">
                <ha-textfield
                    .label=${this.label}
                    .helper=${this.helper}
                    helperPersistent
                    .value=${this.value}
                    @change=${this.onTextChanged}
                ></ha-textfield>
                <input
                    type="color"
                    title=${this.label}
                    .value=${HueColorField.resolveHex(this.value)}
                    @change=${this.onSwatchChanged}
                />
            </div>`}
        `;
    }

    private onTextChanged(ev: Event): void {
        const value = (ev.target as HTMLInputElement).value;
        this.value = value;
        fireEvent(this, 'value-changed', { value });
    }

    private onSwatchChanged(ev: Event): void {
        const value = (ev.target as HTMLInputElement).value;
        this.value = value;
        fireEvent(this, 'value-changed', { value });
    }

    private onThemeToggle(ev: Event): void {
        const checked = (ev.target as HTMLInputElement).checked;
        const value = checked ? this.themeColorValue! : this.fallbackValue;
        this.value = value;
        fireEvent(this, 'value-changed', { value });
    }

    /**
     * @returns best-effort '#rrggbb' representation of the given color string (for the native swatch input).
     * Falls back to a neutral gray when the color cannot be resolved.
     */
    private static resolveHex(value: string): string {
        const fallback = '#888888';
        if (!value)
            return fallback;

        let colorId = value.trim().toLowerCase();
        if (colorId === 'warm') {
            colorId = Consts.WarmColor;
        }
        else if (colorId === 'cold') {
            colorId = Consts.ColdColor;
        }

        try {
            const ctx = document.createElement('canvas').getContext('2d');
            if (!ctx)
                return fallback;

            // reset first, so an unrecognized color doesn't silently keep the previous value
            ctx.fillStyle = '#000000';
            ctx.fillStyle = colorId;
            const resolved = ctx.fillStyle;

            if (/^#[0-9a-f]{6}$/i.test(resolved)) {
                return resolved;
            }

            const rgbMatch = resolved.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (rgbMatch) {
                const toHex = (n: string) => Number(n).toString(16).padStart(2, '0');
                return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
            }
        }
        catch {
            // ignore - fallback used
        }

        return fallback;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'hue-color-field': HueColorField;
    }
}
