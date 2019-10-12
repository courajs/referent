import Controller from '@ember/controller';
import {inject} from '@ember/service';
import {computed} from '@ember/object';
import {alias} from '@ember/object/computed';
import {task, taskGroup, waitForProperty} from 'ember-concurrency';

import {bound} from 'nomicon/lib/hotkeys';
import {CREATE} from 'nomicon/lib/typeahead';

const MODAL_DEFAULTS = {
  showModal: false,
  modalLabel: '',
  modalOptions: [],
  modalPath: '',
  modalChoice: null,
  modalShowCreateOption: false,
  modalSearchText: '',
};

export default Controller.extend({
  graph: inject(),
  sync: inject(),

  page: alias('model.page'),
  title: alias('model.titleSequence'),

  //   ...MODAL_DEFAULTS,
  //   ^ this breaks an ESLint rule
  //   (not FAILS it, BREAKS it -- it errors out. Not set up to
  //   handle the spread operator apparently)
  showModal: false,
  modalLabel: '',
  modalOptions: [],
  modalPath: '',
  modalChoice: null,
  modalShowCreateOption: false,
  modalSearchText: '',

  destroyPage: task(function* (uuid) {
    yield this.graph.delete(uuid);
    yield this.transitionToRoute('home');
  }),

  hotkeys: bound({
    'add-outgoing-link': function() {
      this.promptAddOutgoing.perform();
    },
    'add-incoming-link': function() {
      this.promptAddIncoming.perform();
    },
    'follow-outgoing-link': function() {
      this.promptGoTo.perform();
    },
    'follow-incoming-link': function() {
      this.promptGoFrom.perform();
    },
  }),

  _modalChoice(choice, searchText) {
    this.set('modalChoice', choice);
    this.set('modalSearchText', searchText);
  },

  prompts: taskGroup().drop(),

  promptAddOutgoing: task(function* () {
    let pages = this.graph.pages;
    let uuid = this.model.uuid;
    pages = pages.filter(other => {
      if (other.uuid === uuid) {
        return false;
      }
      return !this.outgoing.some(l => l.page_uuid === other.uuid);
    });

    this.setProperties({
      showModal: true,
      modalLabel: 'Add outgoing link...',
      modalOptions: pages,
      modalPath: "title.value",
      modalShowCreateOption: true,
    });
    let choice = yield waitForProperty(this, 'modalChoice');
    if (choice === CREATE) {
      let newPageAtom = yield this.graph.newPage();
      let {id,seq} = yield this.graph.titleForPage(newPageAtom.uuid);
      let fresh = seq.value.become(this.modalSearchText);
      yield this.sync.write(id, fresh);
      yield this.graph.link(uuid, newPageAtom.uuid);
      this.setProperties(MODAL_DEFAULTS);
      return this.transitionToRoute('page', newPageAtom.uuid);
    } else {
      yield this.graph.link(uuid, choice.uuid);
      this.setProperties(MODAL_DEFAULTS);
    }
  }).group('prompts'),

  promptAddIncoming: task(function* () {
    let pages = this.graph.pages;
    let uuid = this.model.uuid;
    pages = pages.filter(other => {
      if (other.uuid === uuid) {
        return false;
      }
      return !this.incoming.some(l => l.page_uuid === other.uuid);
    });

    this.setProperties({
      showModal: true,
      modalLabel: 'Add incoming link...',
      modalOptions: pages,
      modalPath: 'title.value',
      modalShowCreateOption: true,
    });
    let choice = yield waitForProperty(this, 'modalChoice');
    if (choice === CREATE) {
      let newPageAtom = yield this.graph.newPage();
      let {id,seq} = yield this.graph.titleForPage(newPageAtom.uuid);
      let fresh = seq.value.become(this.modalSearchText);
      yield this.sync.write(id, fresh);
      yield this.graph.link(newPageAtom.uuid, uuid);
      this.setProperties(MODAL_DEFAULTS);
      return this.transitionToRoute('page', newPageAtom.uuid);
    } else {
      yield this.graph.link(choice.uuid, uuid);
      this.setProperties(MODAL_DEFAULTS);
    }
  }).group('prompts'),

  promptGoTo: task(function* () {
    this.setProperties({
      showModal: true,
      modalLabel: 'Go to...',
      modalOptions: this.page.outgoing,
      modalPath: 'to.title',
    });
    let choice = yield waitForProperty(this, 'modalChoice');
    this.setProperties(MODAL_DEFAULTS);
    return this.transitionToRoute('page', choice.to.uuid);
  }).group('prompts'),

  promptGoFrom: task(function* () {
    this.setProperties({
      showModal: true,
      modalLabel: 'Go to...',
      modalOptions: this.page.incoming,
      modalPath: 'from.title',
    });
    let choice = yield waitForProperty(this, 'modalChoice');
    this.setProperties(MODAL_DEFAULTS);
    return this.transitionToRoute('page', choice.from.uuid);
  }).group('prompts'),

  close() {
    this.prompts.cancelAll();
    this.setProperties(MODAL_DEFAULTS);
  },
});
