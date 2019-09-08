import {cmp, eq, lt} from './ids';

export class Graph {
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
      wall: new Date().valueOf(),
    };
  }

  evaluate() {
    let nodes = {};
    let edges = {};
    for (let atom of this.atoms) {
      if (atom.type === 'node') {
        nodes[atom.uuid] = atom;
      } else if (atom.type === 'edge') {
        edges[atom.uuid] = atom;
      } else if (atom.type === 'delete') {
        delete nodes[atom.uuid];
        delete edges[atom.uuid];
      }
    }
    nodes = Object.keys(nodes);
    let outgoing = {};
    let incoming = {};
    for (let atom of Object.values(edges)) {
      let {from,to} = atom;
      if (!nodes.includes(from) || !nodes.includes(to)) {
        continue;
      }
      if (!outgoing[from]) { outgoing[from] = []; }
      outgoing[from].push(atom);
      if (!incoming[to]) { incoming[to] = []; }
      incoming[to].push(atom);
    }
    return {nodes, incoming, outgoing};
  }

  // sort, then iterate over and merge
  mergeAtoms(atoms) {
    atoms.sort((a,b)=>cmp(a.id,b.id));
    let ours = 0;
    let theirs = 0;
    let result = [];
    while (ours < this.atoms.length && theirs < atoms.length) {
      let here = this.atoms[ours];
      let there = atoms[theirs];
      // skip duplicates
      if (eq(here.id, there.id)) {
        result.push(here);
        ours++;
        theirs++;
      } else if (lt(here.id, there.id)) {
        result.push(here);
        ours++;
      } else {
        result.push(there);
        theirs++;
      }
    }
    // add remainders at end
    result.push(...this.atoms.slice(ours));
    result.push(...atoms.slice(theirs));
    this.atoms = result;
    this._determineIndexAndLamport();
  }

  addNode() {
    let node = {
      id: this.nextId(),
      type: 'node',
      uuid: Math.random().toString(),
    };
    this.mergeAtoms([node]);
    return node;
  }

  addEdge(fromuuid, touuid) {
    let edge = {
      id: this.nextId(),
      type: 'edge',
      uuid: Math.random().toString(),
      from: fromuuid,
      to: touuid,
    };
    this.mergeAtoms([edge]);
    return edge;
  }

  // if uuid points to an edge, just mark it as deleted
  // if uuid points to a node, should we also mark all edges to/from it?
  // del(uuid) {}
  delete(uuid) {
    let atom = {
      id: this.nextId(),
      type: 'delete',
      uuid,
    };
    this.mergeAtoms([atom]);
    return atom;
  }
}

export default Graph;
