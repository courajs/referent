import {eq, lt} from './ids';
export function siblingLt(atomA, atomB) {
  if (atomA.type === 'delete' && atomB.type !== 'delete') {
    return true;
  }
  if (atomA.type !== 'delete' && atomB.type === 'delete') {
    return false;
  }
  return atomA.id.lamport > atomB.id.lamport || (atomA.id.lamport === atomB.id.lamport && atomA.id.site < atomB.id.site);
}

export function parent(atom) {
  switch (atom.type) {
    case 'delete':
      return atom.value;
    case 'insert':
      return atom.value.after;
    default:
      throw new Error('parent not defined for this atom type');
  }
}

export class Sequence {
  constructor(id, atoms) {
    this.id = id;
    if (atoms) {
      this.atoms = atoms.slice();
    } else {
      this.atoms = [];
    }
    this._determineIndexAndLamport();
  }

  _determineIndexAndLamport() {
    let index = 0;
    let lamport = 0;
    for (let a of this.atoms) {
      if (a.id.lamport > lamport) {
        lamport = a.id.lamport;
      }
      if (a.id.site === this.id && a.id.index > index) {
        index = a.id.index;
      }
    }
    this.currentIndex = index;
    this.currentLamport = lamport;
  }

  nextId() {
    return {
      site: this.id,
      index: ++this.currentIndex,
      lamport: ++this.currentLamport,
      wall: Date.now(),
    };
  }

  indexBefore(id) {
    let i = 0;
    for (let atom of this.atoms) {
      if (eq(id, atom.id)) {
        return i;
      } else if (atom.type === 'insert') {
        i++;
      } else if (atom.type === 'delete') {
        i--;
      }
    }
  }

  indexAfter(id) {
    let result = 0;
    for (let i=0; i<this.atoms.length; i++) {
      let atom = this.atoms[i];
      if (eq(id, atom.id)) {
        if (this.atoms[i+1] && this.atoms[i+1].type === 'delete') {
          return result;
        } else {
          return result+1;
        }
      } else if (atom.type === 'insert') {
        result++;
      } else if (atom.type === 'delete') {
        result--;
      }
    }
  }

  evaluate() {
    return this.indexedEvaluate().value;
  }

  get value() {
    return this.evaluate();
  }

  indexedEvaluate() {
    let result = [];
    for (let atom of this.atoms) {
      if (atom.type === 'insert') {
        result.push(atom);
      } else if (atom.type === 'delete' && result.length && eq(atom.value, result[result.length-1].id)) {
        result.pop();
      }
    }

    return {
      value: result.map(a=>a.value.ch).join(''),
      index: result.map(a=>a.id),
    }
  }

  // Uses [8] from http://archagon.net/blog/2018/03/24/data-laced-with-history/
  //
  // iterate through the atoms to the right of the head atom until you
  // find one whose parent has a lower Lamport timestamp than the head. This
  // atom is the first atom past the causal block.
  //
  insertAtom(atom) {
    let parentId = parent(atom);

    let parentIndex;
    if (parentId) {
      parentIndex = this.atoms.findIndex(a => eq(a.id, parentId));
      if (parentIndex === -1) {
        return false;
      }
    } else {
      parentIndex = -1;
    }

    let siblingIndices = [];
    for (let i = parentIndex+1; i<this.atoms.length && !lt(parent(this.atoms[i]), parentId); i++) {
      if (eq(parent(this.atoms[i]), parentId)) {
        siblingIndices.push(i);
      }
    }

    let placeBefore = parentIndex+1;
    for(let i = 0; i < siblingIndices.length; i++) {
      if (siblingLt(this.atoms[siblingIndices[i]], atom)) {
        placeBefore = siblingIndices[i+1] || this.atoms.length;
      }
    }
    this.atoms.splice(placeBefore, 0, atom);
    if (atom.id.lamport > this.currentLamport) {
      this.currentLamport = atom.id.lamport;
    }
    if (atom.id.site === this.id && atom.id.index >= this.currentIndex) {
      this.currentIndex = atom.id.index + 1;
    }
    return true;
  }

  mergeAtoms(atoms) {
    return this.insertAtoms(atoms.filter(maybeNewAtom=>!this.atoms.find(existingAtom=>eq(maybeNewAtom.id,existingAtom.id))));
  }

  insertAtoms(atoms) {
    let prevLength;
    do {
      prevLength = atoms.length;
      atoms = atoms.filter(a => !this.insertAtom(a));
    } while (atoms.length > 0 && atoms.length < prevLength);
  }

  // Because of the way DOM input events work, we don't get granular information
  // about exactly how an input/textarea is being changed. Instead, we have to
  // figure it out based on the old and new values.
  //
  // This assumes that any edits have to be on a contiguous range - simultaneous
  // edits on separate parts of the string shouldn't be possible in html inputs.
  //
  // Determine a diffRange - which range of characters should be removed,
  // and where should the new ones be placed.
  //
  // range starts at the front edge of `start` character, ends at front edge of
  // `end` character. So start=0,end=0, will insert at start of string.
  // start=len-1,end=len-1 will insert at end of string.
  // start=2,end=4, chars='hey' will delete 2nd & 3rd characters, and insert the
  // 3-long string 'hey' in that slot.
  //
  // start=3, end=5, chars='xyz'
  // 'ab cd ef'
  // 'ab xyz ef'
  //
  // start=0, end=0, chars='hello '
  // 'world'
  // 'hello world'
  //
  // start=5, end=5, chars=' world'
  // 'hello'
  // 'hello world'
  become(str) {
    let { value, index } = this.indexedEvaluate();

    let start = 0;
    while (start < value.length && start < str.length && value[start] === str[start]) {
      start++;
    }

    let back = 0;
    while (
      value.length - back > start &&
      str.length - back > start &&
      value[value.length-1 - back] === str[str.length-1 - back]
    ) {
      back++;
    }

    let fresh = [];

    for (let i = start; i < value.length - back; i++) {
      let atom = {
        type: 'delete',
        id: this.nextId(),
        value: index[i],
      }
      fresh.push(atom);
      this.insertAtom(atom);
    }

    let prevId = index[start-1] || null;
    for (let i = start; i < str.length - back; i++) {
      let id = this.nextId();
      let atom = {
        type: 'insert',
        id: id,
        value: {
          after: prevId,
          ch: str[i],
        },
      };
      prevId = id;
      fresh.push(atom);
      this.insertAtom(atom);
    }

    return fresh;
  }
}

export default Sequence;
