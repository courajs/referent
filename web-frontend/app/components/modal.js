import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class extends Component {
  @action
  close() {
    if (this.args.close) {
      this.args.close();
    }
  }

  get hotkeys() {
    return {
      'close-modal': this.close,
    };
  }
}
