import { fireEvent, HomeAssistant, LovelaceCardConfig, LovelaceCardEditor } from 'custom-card-helpers';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Consts } from '../types/consts';
import { ClickAction, HueLikeLightCardConfigInterface, KnownIconSize, SceneOrder, SceneProvider, SliderType } from '../types/types-config';
import { localize } from '../localize/localize';
import { HaFormSchemaEntry, HaFormValueChangedDetail } from './ha-form-types';
import { RawSceneEntry } from './hue-scenes-editor';
import './hue-scenes-editor';
import './hue-color-field';

type EditorConfig = Omit<HueLikeLightCardConfigInterface, 'scenes'> & LovelaceCardConfig & { scenes?: RawSceneEntry[] };

const FIELD_LABELS: Record<string, string> = {
    entity: 'Light entity',
    entities: 'Multiple light entities',
    area: 'Area',
    floor: 'Floor',
    label: 'Label',
    groupEntity: 'Group entity',
    title: 'Title',
    description: 'Description',
    icon: 'Icon',
    iconSize: 'Icon size',
    showSwitch: 'Show switch',
    slider: 'Slider type',
    hueBorders: 'Hue-style borders',
    offShadow: 'Inner shadow when off',
    theme: 'Theme',
    defaultColor: 'Default color',
    offColor: 'Off color',
    hueScreenBgColor: 'Hue screen background',
    switchOnScene: 'Scene activated on switch-on',
    onClickAction: 'Click action (light on)',
    offClickAction: 'Click action (light off)',
    onHoldAction: 'Hold action (light on)',
    offHoldAction: 'Hold action (light off)',
    allowZero: 'Allow slider to turn off/on',
    sceneProvider: 'Scene providers',
    sceneOrder: 'Auto-detected scene order',
    apiId: 'API identifier',
    isVisible: 'Card visible'
};

const FIELD_HELPERS: Record<string, string> = {
    entity: "Set exactly one of 'Light entity', 'Multiple light entities', 'Area', 'Floor' or 'Label' to choose which lights this card controls.",
    description: 'Leave empty for an automatic description. Use %s as a placeholder for the number of lit lights.',
    switchOnScene: 'If set, this scene is activated instead of just turning the lights on.',
    apiId: 'Identifier used to control this card from the API interface (see documentation).',
    isVisible: 'Turn off to hide the card completely (useful when only using the API interface).',
    sceneOrder: 'Only applies when scenes are auto-detected (i.e. the scene list below is empty and auto-detect is enabled).'
};

const ICON_SIZE_OPTIONS = [
    { value: KnownIconSize.Small, label: 'Small' },
    { value: KnownIconSize.Original, label: 'Original' },
    { value: KnownIconSize.Big, label: 'Big' }
];

const SLIDER_OPTIONS = [
    { value: SliderType.Default, label: 'Default' },
    { value: SliderType.Mushroom, label: 'Mushroom' },
    { value: SliderType.None, label: 'None (hidden)' }
];

const CLICK_ACTION_OPTIONS = [
    { value: ClickAction.Default, label: 'Default' },
    { value: ClickAction.NoAction, label: 'None' },
    { value: ClickAction.TurnOn, label: 'Turn on' },
    { value: ClickAction.TurnOff, label: 'Turn off' },
    { value: ClickAction.MoreInfo, label: 'More info' },
    { value: ClickAction.Scene, label: 'Activate scene' },
    { value: ClickAction.HueScreen, label: 'Open Hue screen' }
];

const SCENE_ORDER_OPTIONS = [
    { value: SceneOrder.Default, label: 'Default' },
    { value: SceneOrder.NameAsc, label: 'Name (A -> Z)' },
    { value: SceneOrder.NameDesc, label: 'Name (Z -> A)' }
];

const SCENE_PROVIDER_OPTIONS = [
    { value: SceneProvider.HaScenes, label: 'Home Assistant scenes' },
    { value: SceneProvider.ScenePresets, label: 'Hue scene presets' }
];

const ENTITIES_SCHEMA: HaFormSchemaEntry[] = [
    { name: 'entity', selector: { entity: { domain: ['light', 'switch'] } } },
    { name: 'entities', selector: { entity: { domain: ['light', 'switch'], multiple: true } } },
    { name: 'area', selector: { area: {} } },
    { name: 'floor', selector: { floor: {} } },
    { name: 'label', selector: { label: {} } },
    { name: 'groupEntity', selector: { entity: { domain: 'light' } } },
    { name: 'title', selector: { text: {} } },
    { name: 'description', selector: { text: {} } }
];

const APPEARANCE_SCHEMA: HaFormSchemaEntry[] = [
    {
        name: '',
        type: 'grid',
        schema: [
            { name: 'icon', selector: { icon: {} } },
            { name: 'iconSize', selector: { select: { mode: 'dropdown', options: ICON_SIZE_OPTIONS } } }
        ]
    },
    {
        name: '',
        type: 'grid',
        schema: [
            { name: 'showSwitch', selector: { boolean: {} } },
            { name: 'hueBorders', selector: { boolean: {} } },
            { name: 'offShadow', selector: { boolean: {} } }
        ]
    },
    { name: 'slider', selector: { select: { mode: 'dropdown', options: SLIDER_OPTIONS } } },
    { name: 'theme', selector: { theme: {} } }
];

const INTERACTIONS_SCHEMA: HaFormSchemaEntry[] = [
    { name: 'switchOnScene', selector: { entity: { domain: 'scene' } } },
    {
        name: '',
        type: 'grid',
        schema: [
            { name: 'onClickAction', selector: { select: { mode: 'dropdown', options: CLICK_ACTION_OPTIONS } } },
            { name: 'offClickAction', selector: { select: { mode: 'dropdown', options: CLICK_ACTION_OPTIONS } } },
            { name: 'onHoldAction', selector: { select: { mode: 'dropdown', options: CLICK_ACTION_OPTIONS } } },
            { name: 'offHoldAction', selector: { select: { mode: 'dropdown', options: CLICK_ACTION_OPTIONS } } }
        ]
    },
    { name: 'allowZero', selector: { boolean: {} } }
];

const SCENES_TOP_SCHEMA: HaFormSchemaEntry[] = [
    { name: 'sceneProvider', selector: { select: { mode: 'list', multiple: true, options: SCENE_PROVIDER_OPTIONS } } }
];

const SCENE_ORDER_SCHEMA: HaFormSchemaEntry[] = [
    { name: 'sceneOrder', selector: { select: { mode: 'dropdown', options: SCENE_ORDER_OPTIONS } } }
];

const ADVANCED_SCHEMA: HaFormSchemaEntry[] = [
    { name: 'apiId', selector: { text: {} } },
    { name: 'isVisible', selector: { boolean: {} } }
];

/**
 * Graphical configuration editor for the Hue-Like Light Card.
 */
@customElement(Consts.CardEditorElementName)
export class HueLikeLightCardEditor extends LitElement implements LovelaceCardEditor {
    @property({ attribute: false })
    public hass?: HomeAssistant;

    @state()
    private _config?: EditorConfig;

    /** Cache of the last non-empty manual scene list, so toggling auto-detect off/on doesn't lose edits. */
    private _lastManualScenes: RawSceneEntry[] = [];

    public setConfig(config: LovelaceCardConfig): void {
        this._config = config as EditorConfig;
    }

    public static override styles = css`
    ha-expansion-panel {
        margin-bottom: 12px;
    }
    ha-expansion-panel ha-form {
        display: block;
        padding: 12px;
    }
    .scenes-content {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .colors-content {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    .entities-note {
        padding: 0 12px 12px;
        font-size: 13px;
        color: var(--secondary-text-color);
    }
    `;

    protected override render() {
        if (!this.hass || !this._config)
            return nothing;

        const hasComplexEntities = Array.isArray(this._config.entities) &&
            this._config.entities.some(e => typeof e !== 'string');

        const autoDetectScenes = this._config.scenes === undefined;
        const manualScenes: RawSceneEntry[] = (this._config.scenes as RawSceneEntry[] | undefined) ?? this._lastManualScenes;

        return html`
        <ha-expansion-panel outlined expanded .header=${localize(this.hass, 'editor.section.entities')}>
            <ha-form
                .hass=${this.hass}
                .data=${this._config}
                .schema=${hasComplexEntities ? ENTITIES_SCHEMA.filter(s => s.name !== 'entities') : ENTITIES_SCHEMA}
                .computeLabel=${this.computeLabel}
                .computeHelper=${this.computeHelper}
                @value-changed=${this.onFormChanged}
            ></ha-form>
            ${hasComplexEntities
        ? html`<div class="entities-note">This card uses a per-entity title/icon configuration for 'entities', which can only be edited in YAML.</div>`
        : nothing}
        </ha-expansion-panel>

        <ha-expansion-panel outlined .header=${localize(this.hass, 'editor.section.appearance')}>
            <ha-form
                .hass=${this.hass}
                .data=${this._config}
                .schema=${APPEARANCE_SCHEMA}
                .computeLabel=${this.computeLabel}
                .computeHelper=${this.computeHelper}
                @value-changed=${this.onFormChanged}
            ></ha-form>
        </ha-expansion-panel>

        <ha-expansion-panel outlined .header=${localize(this.hass, 'editor.section.colors')}>
            <div class="colors-content">
                <hue-color-field
                    .label=${FIELD_LABELS.defaultColor}
                    .helper=${"Used when a light doesn't support colors."}
                    .value=${this._config.defaultColor ?? ''}
                    @value-changed=${(ev: CustomEvent) => this.onColorChanged('defaultColor', ev)}
                ></hue-color-field>
                <hue-color-field
                    .label=${FIELD_LABELS.offColor}
                    .helper=${'Color of the card when all lights are off.'}
                    .value=${this._config.offColor ?? ''}
                    @value-changed=${(ev: CustomEvent) => this.onColorChanged('offColor', ev)}
                ></hue-color-field>
                <hue-color-field
                    .label=${FIELD_LABELS.hueScreenBgColor}
                    .helper=${'Background color of the Hue screen pop-up.'}
                    .value=${this._config.hueScreenBgColor ?? ''}
                    @value-changed=${(ev: CustomEvent) => this.onColorChanged('hueScreenBgColor', ev)}
                ></hue-color-field>
            </div>
        </ha-expansion-panel>

        <ha-expansion-panel outlined .header=${localize(this.hass, 'editor.section.interactions')}>
            <ha-form
                .hass=${this.hass}
                .data=${this._config}
                .schema=${INTERACTIONS_SCHEMA}
                .computeLabel=${this.computeLabel}
                .computeHelper=${this.computeHelper}
                @value-changed=${this.onFormChanged}
            ></ha-form>
        </ha-expansion-panel>

        <ha-expansion-panel outlined .header=${localize(this.hass, 'editor.section.scenes')}>
            <ha-form
                .hass=${this.hass}
                .data=${this._config}
                .schema=${SCENES_TOP_SCHEMA}
                .computeLabel=${this.computeLabel}
                .computeHelper=${this.computeHelper}
                @value-changed=${this.onFormChanged}
            ></ha-form>
            <div class="scenes-content">
                <ha-formfield .label=${localize(this.hass, 'editor.scenes.autoDetect')}>
                    <ha-switch
                        .checked=${autoDetectScenes}
                        @change=${this.onAutoDetectScenesChanged}
                    ></ha-switch>
                </ha-formfield>
                <div class="entities-note">${localize(this.hass, 'editor.scenes.autoDetectHelper')}</div>
                ${autoDetectScenes
        ? html`<ha-form
                        .hass=${this.hass}
                        .data=${this._config}
                        .schema=${SCENE_ORDER_SCHEMA}
                        .computeLabel=${this.computeLabel}
                        .computeHelper=${this.computeHelper}
                        @value-changed=${this.onFormChanged}
                    ></ha-form>`
        : html`<hue-scenes-editor
                        .hass=${this.hass}
                        .scenes=${manualScenes}
                        @value-changed=${this.onScenesChanged}
                    ></hue-scenes-editor>`
}
            </div>
        </ha-expansion-panel>

        <ha-expansion-panel outlined .header=${localize(this.hass, 'editor.section.advanced')}>
            <ha-form
                .hass=${this.hass}
                .data=${this._config}
                .schema=${ADVANCED_SCHEMA}
                .computeLabel=${this.computeLabel}
                .computeHelper=${this.computeHelper}
                @value-changed=${this.onFormChanged}
            ></ha-form>
        </ha-expansion-panel>
        `;
    }

    private computeLabel = (schema: HaFormSchemaEntry): string => {
        return FIELD_LABELS[schema.name] ?? schema.name;
    };

    private computeHelper = (schema: HaFormSchemaEntry): string | undefined => {
        return FIELD_HELPERS[schema.name];
    };

    private onFormChanged(ev: CustomEvent<HaFormValueChangedDetail>): void {
        ev.stopPropagation();
        this._config = ev.detail.value as EditorConfig;
        this.fireConfigChanged();
    }

    private onColorChanged(key: 'defaultColor' | 'offColor' | 'hueScreenBgColor', ev: CustomEvent): void {
        if (!this._config)
            return;

        const value = ev.detail.value as string;
        this._config = { ...this._config, [key]: value || undefined };
        this.fireConfigChanged();
    }

    private onAutoDetectScenesChanged(ev: Event): void {
        if (!this._config)
            return;

        const checked = (ev.target as HTMLInputElement).checked;
        const config = { ...this._config } as Record<string, unknown>;

        if (checked) {
            // remember current manual list, then let scenes be auto-detected
            this._lastManualScenes = (this._config.scenes as RawSceneEntry[] | undefined) ?? [];
            delete config.scenes;
        }
        else {
            config.scenes = this._lastManualScenes;
        }

        this._config = config as EditorConfig;
        this.fireConfigChanged();
    }

    private onScenesChanged(ev: CustomEvent): void {
        if (!this._config)
            return;

        const scenes = ev.detail.value as RawSceneEntry[];
        this._lastManualScenes = scenes;
        this._config = { ...this._config, scenes };
        this.fireConfigChanged();
    }

    private fireConfigChanged(): void {
        fireEvent(this, 'config-changed', { config: this._config });
    }
}
