import Controller from '@ember/controller';
import {inject} from '@ember/service';
import {tracked} from '@glimmer/tracking';
import {action} from '@ember/object';

import {bound} from 'nomicon/lib/hotkeys';
import env from 'nomicon/config/environment';

export default Controller.extend({
  auth: inject(),
  graph: inject(),

  environment: env.environment,
  showModal: false,

  hotkeys: bound({
    'page-switcher': function() {
      this.set('showModal', true);
    },
    'new-page': function() {
      this.transitionToRoute('new');
    }
  }),

  @action
  goToPage(p) {
    this.transitionToRoute('page', p.uuid);
    this.set('showModal', false);
  },

  @action
  search() {
    this.set('showModal', true);
  }
});
