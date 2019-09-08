import Component from '@ember/component';

import {bound} from 'nomicon/lib/hotkeys';

export default Component.extend({
  keyboardActivated: true,
  close() {},

  hotkeys: bound({
    'close-modal': function() {
      this.close();
    }
  }),
});
