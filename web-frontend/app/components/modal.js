import Component from '@glimmer/component';

import {bound} from 'nomicon/lib/hotkeys';

export default class extends Component {
  close() {
    if (this.args.close) {
      this.args.close();
    }
  }

  get hotkeys() {
    return {
      'close-modal': () => this.close(),
    };
  }
}
