import Controller from '@ember/controller';
import {inject as service} from '@ember/service';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';
import {merge} from 'rxjs';
import {map} from 'rxjs/operators';

function logify({at, message}) {
  return {kind: 'message', message};
}

function tag(kind) {
  return map(function(o) {
    return Object.assign({kind}, o);
  });
}

export default class extends Controller {
  @service sw;

  @tracked event_log = [];

  get event_pre() {
    return JSON.stringify(this.event_log, null, 2);
  }

  constructor(...args) {
    super(...args);

    let last;
    merge(
      this.sw.incoming_log.pipe(tag('in')),
      this.sw.outgoing_log.pipe(tag('out')),
    ).subscribe(
      ({kind, value, timestamp}) => {
        if (last && (timestamp-last > 50)) {
          this.event_log.push({kind:'wait', duration: timestamp-last});
        }
        last = timestamp;
        this.event_log.push({kind, message: value});
        this.event_log = this.event_log;
      }
    )
  }

//   get event_log() {
//     let ins = this.sw.incoming_log;
//     let out = this.sw.outgoing_log;
//     if (ins.length === 0 && out.length === 0) {
//       return [];
//     }
// 
//     let result = [];
//     let last;
//     let i = 0;
//     let j = 0;
//     if (ins.length) {
//       last = ins[0];
//       if (out.length && out[0].at < last.at) {
//         last = out[0];
//         j++;
//       } else {
//         i++;
//       }
//     } else {
//       last = out[0];
//       j++;
//     }
// 
//     while (i < ins.length && j < out.length) {
//       i++;
//       j++;
//     }
// 
//     // [{at:date,msg:obj}]
//     // [{at:date,msg:obj}]
//     // ->
//     // [{kind: 'message', msg:}, {kind: 'wait', length: 81ms}]
//     return '[]';
//   }

  @action
  ping() {
    this.sw.send('sw_ping');
  }
}
