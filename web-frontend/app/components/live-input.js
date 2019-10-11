import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class extends Component {
  @service sync;

  update(seq, e) {
    let fresh = seq.become(e.target.value);
    this.sync.write(this.args.sequence.id, fresh);
  }
}
