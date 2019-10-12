import Controller from '@ember/controller';
import {inject} from '@ember/service';
import {computed} from '@ember/object';
import {alias} from '@ember/object/computed';
import {task, taskGroup, waitForProperty} from 'ember-concurrency';
import {take,last} from 'rxjs/operators';

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
    let uuid = this.model.uuid;

    let links = this.model.links.getSubject().value.outgoing;
    let pages = this.graph.pages.getSubject().value;

    pages = pages.filter(p => {
      if (p.uuid === uuid) {
        return false;
      }
      return !links.some(l => l.page_uuid === p.uuid);
    });

    this.setProperties({
      showModal: true,
      modalLabel: 'Add outgoing link...',
      modalOptions: pages,
      modalPath: 'title.source._subject.value.value',
      modalShowCreateOption: true,
    });
    let choice = yield waitForProperty(this, 'modalChoice');

    if (choice === CREATE) {
      let newPageAtom = yield this.graph.newPage();
      let newId = newPageAtom.uuid;

      let link_promise = this.graph.link(uuid, newId);

      let titleId = ['page',newId,'title'];
      let title = this.sync.sequence(titleId);
      let seq = yield title.pipe(take(2),last()).toPromise();
      let fresh = seq.become(this.modalSearchText);

      yield this.sync.write(titleId, fresh);
      yield link_promise;

      this.setProperties(MODAL_DEFAULTS);
      return this.transitionToRoute('page', newId);
    } else {
      yield this.graph.link(uuid, choice.uuid);
      this.setProperties(MODAL_DEFAULTS);
    }
  }).group('prompts'),

  promptAddIncoming: task(function* () {
    let uuid = this.model.uuid;

    let links = this.model.links.getSubject().value.incoming;
    let pages = this.graph.pages.getSubject().value;

    // other pages we're not already linked to
    pages = pages.filter(p => {
      if (p.uuid === uuid) {
        return false;
      }
      return !links.some(l => l.page_uuid === p.uuid);
    });

    this.setProperties({
      showModal: true,
      modalLabel: 'Add incoming link...',
      modalOptions: pages,
      modalPath: 'title.source._subject.value.value',
      modalShowCreateOption: true,
    });
    let choice = yield waitForProperty(this, 'modalChoice');

    if (choice === CREATE) {
      let newPageAtom = yield this.graph.newPage();
      let newId = newPageAtom.uuid;

      let link_promise = this.graph.link(newId, uuid);

      let titleId = ['page',newId,'title'];
      let title = this.sync.sequence(titleId);
      let seq = yield title.pipe(take(2),last()).toPromise();
      let fresh = seq.become(this.modalSearchText);

      yield this.sync.write(titleId, fresh);
      yield link_promise;
      // let {id,seq} = yield this.graph.titleForPage(newPageAtom.uuid);
      // let fresh = seq.value.become(this.modalSearchText);
      // yield this.sync.write(id, fresh);
      // yield this.graph.link(newPageAtom.uuid, uuid);

      this.setProperties(MODAL_DEFAULTS);
      return this.transitionToRoute('page', newId);
    } else {
      yield this.graph.link(choice.uuid, uuid);
      this.setProperties(MODAL_DEFAULTS);
    }
  }).group('prompts'),

  // HACK: this modalPath is pretty janky.
  // It uses knowledge that title is a refCount around a
  // multicast using a BehaviorSubject.
  promptGoTo: task(function* () {
    let links = this.model.links.getSubject().value;
    this.setProperties({
      showModal: true,
      modalLabel: 'Go to...',
      modalOptions: links.outgoing,
      modalPath: 'title.source._subject.value.value',
    });
    let choice = yield waitForProperty(this, 'modalChoice');
    this.setProperties(MODAL_DEFAULTS);
    return this.transitionToRoute('page', choice.page_uuid);
  }).group('prompts'),

  // HACK: this modalPath is pretty janky.
  // It uses knowledge that title is a refCount around a
  // multicast using a BehaviorSubject.
  promptGoFrom: task(function* () {
    let links = this.model.links.getSubject().value;
    this.setProperties({
      showModal: true,
      modalLabel: 'Go to...',
      modalOptions: links.incoming,
      modalPath: 'title.source._subject.value.value',
    });
    let choice = yield waitForProperty(this, 'modalChoice');
    this.setProperties(MODAL_DEFAULTS);
    return this.transitionToRoute('page', choice.page_uuid);
  }).group('prompts'),

  close() {
    this.prompts.cancelAll();
    this.setProperties(MODAL_DEFAULTS);
  },
});
