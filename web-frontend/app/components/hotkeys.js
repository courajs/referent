import Component from '@ember/component';

import {EKMixin, keyDown} from 'ember-keyboard';

export default Component.extend(EKMixin, {
  keyboardActivated: true,
  handlers: {},
  close() {},

  init() {
    this._super(...arguments);
    if (this.priority) {
      this.set('keyboardPriority', this.priority);
    }
    for (let key in this.handlers) {
      if (!(key in DEFS)) {
        console.error(`No hotkey definition for ${key}`);
      } else {
        DEFS[key].forEach((event) => {
          this.on(event, function(e, emberKeyboardEvent) {
            emberKeyboardEvent.stopImmediatePropagation();
            e.preventDefault();
            this.handlers[key]();
          });
        });
      }
    }
  },
});

const DEFS = {
  'close-modal': ['Escape'],

  'page-switcher': ['cmd+KeyK'],

  'typeahead-up': ['ArrowUp', 'cmd+KeyK', 'ctrl+KeyK'],
  'typeahead-down': ['ArrowDown', 'cmd+KeyJ', 'ctrl+KeyJ'],
  'typeahead-confirm': ['Enter'],

  'add-outgoing-link': ['ctrl+Period'],
  'add-incoming-link': ['ctrl+Comma'],
  'follow-outgoing-link': ['ctrl+BracketRight'],
  'follow-incoming-link': ['ctrl+BracketLeft'],

  'new-page': ['ctrl+KeyM'],
}

for (let key in DEFS) {
  DEFS[key] = DEFS[key].map(keyDown);
}
