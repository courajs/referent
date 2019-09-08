import Controller from '@ember/controller';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class extends Controller {
  @service sync;

  shortcuts = new Map([
['First char', `{
  type: 'insert',
  id: {
    site: 'chromicon',
    index: 1,
    lamport: 1,
    wall: Date.now(),
  },
  value: {
    ch: 'a',
    after: null,
  }
}`],

['Later char', `{
  type: 'insert',
  id: {
    site: 'chromicon',
    index: 2,
    lamport: 2,
    wall: Date.now(),
  },
  value: {
    ch: 'c',
    after: {
      site: 'chromicon',
      index: 1,
      lamport: 1,
      wall: Date.now(),
    },
  }
}`],

['Graph node', `{
  id: {
    site: 'chromicon',
    index: 1,
    lamport: 1,
    wall: Date.now(),
  },
  type: 'node',
  uuid: Math.random().toString(),
}`],

['Graph edge', `{
  id: {
    site: 'chromicon',
    index: 2,
    lamport: 2,
    wall: Date.now(),
  },
  type: 'edge',
  uuid: Math.random().toString(),
  from: 'a',
  to: 'b',
}`],
  ]);

  @tracked collectionName = '';
  @tracked valueString = '';
  @tracked submitted = false;

  go(e) {
    e.preventDefault();
    if (this.submitted) { return; }
    this.sync.directWrite(this.collectionName, eval('('+this.valueString+')'));
    this.submitted = true;
  }

  setTo(val, e) {
    e.preventDefault();
    this.valueString = val;
  }
}
