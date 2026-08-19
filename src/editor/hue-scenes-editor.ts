import { fireEvent, HomeAssistant } from 'custom-card-helpers';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { localize } from '../localize/localize';

/** Plain (not-yet-parsed) shape of a single scene entry, as it comes from / goes into YAML config. */
export type RawSceneEntry = string | Record<string, unknown>;

interface EditableScene {
    entity: string;
    title?: string;
    icon?: string;
    color?: string;
    visible?: boolean;
    /** Present when scene uses a custom activation service/data - preserved as-is, not editable here. */
    hasAdvancedActivation: boolean;
    activation?: string;
    activationData?: Record<string, unknown>;
}

function normalizeScene(raw: RawSceneEntry): EditableScene {
    if (typeof raw === 'string') {
        return { entity: raw, hasAdvancedActivation: false };
    }

    return {
        entity: raw.entity as string,
        title: raw.title as string | undefined,
        icon: raw.icon as string | undefined,
        color: raw.color as string | undefined,
        visible: raw.visible as boolean | undefined,
        activation: raw.activation as string | undefined,
        activationData: raw.activationData as Record<string, unknown> | undefined,
        hasAdvancedActivation: raw.activation !== undefined || raw.activationData !== undefined
    };
}

function serializeScene(row: EditableScene): RawSceneEntry {
    const hasExtra = row.title !== undefined || row.icon !== undefined || row.color !== undefined ||
        row.visible === false || row.activation !== undefined || row.activationData !== undefined;

    if (!hasExtra) {
        return row.entity;
    }

    const result: Record<string, unknown> = { entity: row.entity };
    if (row.title !== undefined) result.title = row.title;
    if (row.icon !== undefined) result.icon = row.icon;
    if (row.color !== undefined) result.color = row.color;
    if (row.visible === false) result.visible = false;
    if (row.activation !== undefined) result.activation = row.activation;
    if (row.activationData !== undefined) result.activationData = row.activationData;

    return result;
}

/**
 * Graphical editor for the 'scenes' list of the Hue-Like Light Card config.
 * Lets the user add/remove/reorder scenes and customize each scene's title, icon, color and visibility.
 */
@customElement('hue-scenes-editor')
export class HueScenesEditor extends LitElement {
    @property({ attribute: false })
    public hass?: HomeAssistant;

    @property({ attribute: false })
    public scenes: RawSceneEntry[] = [];

    @state()
    private _newEntity = '';

    public static override styles = css`
    .scene-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
        border-bottom: 1px solid var(--divider-color);
    }
    .scene-row.hidden {
        opacity: 0.5;
    }
    .scene-main {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        min-width: 0;
        gap: 4px;
    }
    .scene-main .fields {
        display: flex;
        gap: 8px;
    }
    ha-textfield {
        flex-grow: 1;
    }
    hue-color-field {
        flex-grow: 1;
        min-width: 160px;
    }
    ha-icon-picker {
        width: 130px;
        flex-shrink: 0;
    }
    .reorder-buttons {
        display: flex;
        flex-direction: column;
    }
    .reorder-buttons ha-icon-button {
        --mdc-icon-button-size: 28px;
        --mdc-icon-size: 18px;
    }
    .add-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 12px;
    }
    .add-row ha-entity-picker {
        flex-grow: 1;
    }
    .advanced-hint {
        font-size: 12px;
        color: var(--secondary-text-color);
    }
    .empty {
        color: var(--secondary-text-color);
        font-size: 14px;
        padding: 8px 0;
    }
    `;

    protected override render() {
        if (!this.hass)
            return nothing;

        const rows = this.scenes.map(normalizeScene);

        return html`
        ${rows.length === 0
        ? html`<div class="empty">${localize(this.hass!, 'editor.scenes.empty')}</div>`
        : nothing}
        ${rows.map((row, index) => this.renderRow(row, index, rows.length))}
        <div class="add-row">
            <ha-entity-picker
                .hass=${this.hass}
                .value=${this._newEntity}
                .includeDomains=${['scene']}
                .label=${localize(this.hass!, 'editor.scenes.addScene')}
                allow-custom-entity
                @value-changed=${this.onAddEntityChanged}
            ></ha-entity-picker>
        </div>
        `;
    }

    private renderRow(row: EditableScene, index: number, count: number) {
        return html`
        <div class="scene-row ${row.visible === false ? 'hidden' : ''}">
            <div class="reorder-buttons">
                <ha-icon-button
                    .disabled=${index === 0}
                    .path=${'M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z'}
                    label=${localize(this.hass!, 'editor.scenes.moveUp')}
                    @click=${() => this.move(index, -1)}
                ></ha-icon-button>
                <ha-icon-button
                    .disabled=${index === count - 1}
                    .path=${'M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z'}
                    label=${localize(this.hass!, 'editor.scenes.moveDown')}
                    @click=${() => this.move(index, 1)}
                ></ha-icon-button>
            </div>
            <ha-icon-picker
                .hass=${this.hass}
                .value=${row.icon ?? ''}
                .label=${localize(this.hass!, 'editor.scenes.iconLabel')}
                @value-changed=${(ev: CustomEvent) => this.updateRow(index, { icon: ev.detail.value || undefined })}
            ></ha-icon-picker>
            <div class="scene-main">
                <div class="fields">
                    <ha-textfield
                        .label=${row.entity}
                        .helper=${localize(this.hass!, 'editor.scenes.titleHelper')}
                        helperPersistent
                        .value=${row.title ?? ''}
                        @change=${(ev: Event) => this.updateRow(index, { title: (ev.target as HTMLInputElement).value || undefined })}
                    ></ha-textfield>
                    <hue-color-field
                        .label=${localize(this.hass!, 'editor.scenes.colorLabel')}
                        .value=${row.color ?? ''}
                        @value-changed=${(ev: CustomEvent) => this.updateRow(index, { color: ev.detail.value || undefined })}
                    ></hue-color-field>
                </div>
                ${row.hasAdvancedActivation
        ? html`<div class="advanced-hint">${localize(this.hass!, 'editor.scenes.advancedHint')}</div>`
        : nothing}
            </div>
            <ha-icon-button
                .path=${row.visible === false
        ? 'M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.92 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z'
        : 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z'}
                label=${row.visible === false ? localize(this.hass!, 'editor.scenes.sceneHidden') : localize(this.hass!, 'editor.scenes.sceneVisible')}
                @click=${() => this.updateRow(index, { visible: row.visible === false ? undefined : false })}
            ></ha-icon-button>
            <ha-icon-button
                .path=${'M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z'}
                label=${localize(this.hass!, 'editor.scenes.removeScene')}
                @click=${() => this.removeScene(index)}
            ></ha-icon-button>
        </div>
        `;
    }

    private onAddEntityChanged(ev: CustomEvent): void {
        const entity = ev.detail.value as string;
        if (!entity)
            return;

        const rows = this.scenes.map(normalizeScene);
        if (rows.some(r => r.entity === entity)) {
            this._newEntity = '';
            return;
        }

        rows.push({ entity, hasAdvancedActivation: false });
        this._newEntity = '';
        this.emitChange(rows);
    }

    private updateRow(index: number, patch: Partial<EditableScene>): void {
        const rows = this.scenes.map(normalizeScene);
        rows[index] = { ...rows[index], ...patch };
        this.emitChange(rows);
    }

    private move(index: number, offset: number): void {
        const rows = this.scenes.map(normalizeScene);
        const target = index + offset;
        if (target < 0 || target >= rows.length)
            return;

        [rows[index], rows[target]] = [rows[target], rows[index]];
        this.emitChange(rows);
    }

    private removeScene(index: number): void {
        const rows = this.scenes.map(normalizeScene);
        rows.splice(index, 1);
        this.emitChange(rows);
    }

    private emitChange(rows: EditableScene[]): void {
        const value = rows.map(serializeScene);
        fireEvent(this, 'value-changed', { value });
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'hue-scenes-editor': HueScenesEditor;
    }
}
