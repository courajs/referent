import Service from '@ember/service';
import {open} from 'nomicon/lib/idb';

export default class IDB extends Service {
  db = open();
}
