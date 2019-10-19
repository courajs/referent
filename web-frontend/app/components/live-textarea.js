import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

// TODO: this and live-input are pretty much exactly the same,
// except for the tag being used. can we factor them better?
export default class extends Component {
  @service sync;

  _previousEval;

  update(seq, e) {
    let fresh = seq.become(e.target.value);
    this._previousEval = seq.indexedEvaluate();
    this.sync.write(this.args.sequence.id, fresh);
  }

  initialValue(el, [seq]) {
    this._previousEval = seq.indexedEvaluate();
    el.value = this._previousEval.value;
  }

  // TODO: why do we get multiple blank values initially?
  // experiment with skipping all blank values, or including
  // only an initial one.
  updateValue(el, [seq]) {
    let start = el.selectionStart;
    let end = el.selectionEnd;
    let {value,index} = this._previousEval;

    let atEnd, rangeSelected, start_id, end_id;
    if (start === index.length) {
      atEnd = true;
      if (start > 0) {
        start_id = index[index.length-1];
      }
    } else if (end > start) {
      rangeSelected = true;
      start_id = index[start];
      end_id = index[end-1];
    } else {
      start_id = index[start];
    }

    let newEval = this._previousEval = seq.indexedEvaluate();

    el.value = newEval.value;
    if (atEnd) {
      if (start_id) {
        el.selectionStart = el.selectionEnd = seq.indexAfter(start_id);
      } else {
        el.selectionStart = el.selectionEnd = 0;
      }
    } else if (rangeSelected) {
      el.selectionStart = seq.indexBefore(start_id);
      el.selectionEnd = seq.indexAfter(end_id);
    } else {
      el.selectionStart = el.selectionEnd = seq.indexBefore(start_id);
    }
  }
}
