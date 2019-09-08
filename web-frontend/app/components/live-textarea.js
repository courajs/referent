import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class extends Component {
  @service sync;
  
  get value() {
    return this.args.sequence.seq.value.evaluate();
  }

  update(e) {
    let fresh = this.args.sequence.seq.value.become(e.target.value);
    this.sync.write(this.args.sequence.id, fresh);
  }
}
