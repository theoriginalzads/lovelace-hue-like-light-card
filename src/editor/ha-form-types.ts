/**
 * Minimal typings for the 'ha-form' + 'ha-selector' custom elements provided at
 * runtime by the Home Assistant frontend. These are not published as a package,
 * so only the subset of their contract used by this card's editor is declared here.
 */

export declare type HaFormSelector = Record<string, Record<string, unknown> | null>;

export interface HaFormSchema {
    name: string;
    label?: string;
    helper?: string;
    required?: boolean;
    disabled?: boolean;
    selector: HaFormSelector;
}

export interface HaFormGridSchema {
    name: '';
    type: 'grid';
    schema: HaFormSchema[];
    column_min_width?: string;
}

export type HaFormSchemaEntry = HaFormSchema | HaFormGridSchema;

export interface HaFormValueChangedDetail {
    value: Record<string, unknown>;
}
