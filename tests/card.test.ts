import { HueLikeLightCard } from '../src/hue-like-light-card';
import { Consts } from '../src/types/consts';
import { hassMockup } from './mockup-hass-states';

describe('Card', () => {
    it('creates card instance, config first', () => {
        const card = new HueLikeLightCard();
        card.setConfig({
            type: 'custom:' + Consts.CardElementName,
            entity: 'light.test'
        });
        card.hass = hassMockup;
    });

    it('creates card instance, hass first', () => {
        const card = new HueLikeLightCard();
        card.hass = hassMockup;
        card.setConfig({
            type: 'custom:' + Consts.CardElementName,
            entity: 'light.test'
        });
    });

    it('works with style', () => {
        const s = '*{color:white}';
        const card = new HueLikeLightCard();
        card.setConfig({
            type: 'custom:' + Consts.CardElementName,
            entity: 'light.test',
            style: '*{color:white}'
        });

        // eslint-disable-next-line @typescript-eslint/dot-notation
        expect(card['_config']?.style).toBe(s);
    });

    it('works with card_mod/style', () => {
        const s = { style: '*{color:white}' };
        const card = new HueLikeLightCard();
        card.setConfig({
            type: 'custom:' + Consts.CardElementName,
            entity: 'light.test',
            card_mod: s
        });

        // eslint-disable-next-line @typescript-eslint/dot-notation
        expect(card['_config']?.card_mod).toBe(s);
    });

    it('provides a config element (visual editor)', () => {
        const editor = HueLikeLightCard.getConfigElement();

        expect(editor).toBeTruthy();
        expect(editor.tagName.toLowerCase()).toBe(Consts.CardEditorElementName);
        expect(typeof editor.setConfig).toBe('function');
    });

    it('provides a stub config', () => {
        const stub = HueLikeLightCard.getStubConfig(hassMockup);

        expect(stub.entity).toBe('light.test');
    });
});