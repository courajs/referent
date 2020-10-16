import Component from '@glimmer/component';
import {tracked} from '@glimmer/tracking';
import {get, action} from '@ember/object';

import {CREATE} from 'nomicon/lib/typeahead';

export default class extends Component {
  CREATE = CREATE;

  @tracked choice = 0;
  @tracked search = '';

  get results() {
    let search = this.search.toLowerCase().split(' ');
    let options = this.args.options || [];
    options = options.filter((item) => {
      let searchVal;
      if (this.args.path) {
        searchVal = get(item, this.args.path);
      } else {
        searchVal = item;
      }
      searchVal = searchVal.toLowerCase();
      return containsForward(searchVal, search);
    });
    if (this.args.showCreateOption && this.search) {
      options.push(CREATE);
    }
    return options;
  }

  @action
  updateSearch(newTerm) {
    this.choice = 0;
    this.search = newTerm;
  }

  focus(el) {
    el.focus();
  }

  @action
  up() {
    this.choice = Math.max(0, this.choice-1);
  }

  @action
  down() {
    this.choice = Math.min(this.results.length-1, this.choice+1);
  }

  @action
  confirm() {
    this.args.choose(this.results[this.choice], this.search);
  }

  hotkeys = {
    'typeahead-up': this.up,
    'typeahead-down': this.down,
    'typeahead-confirm': this.confirm,
  };
}

function containsForward(string, searchList) {
  let index = 0;
  for (let term of searchList) {
    index = string.indexOf(term, index);
    if (index === -1) {
      return false;
    }
  }
  return true;
}


