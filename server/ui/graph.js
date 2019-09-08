import {getClientName, collection} from '../lib/data-service.js';
import Graph from '../lib/ordts/graph.js';

export default class GraphComponent {
  constructor(el, name) {
    this.el = el;


    Promise.all([collection(name), getClientName()]).then(([c, client_name]) => {
      this.collection = c;
      this.graph = new Graph(client_name);
      this.graph.mergeAtoms(c.data);
      this.render();
    });
  }

  render() {
    this.el.innerHTML = `
      <button class="new-node">+</button>
      <p>From on the left, to on top</p>
      <table></table>
      `;

    this.table = this.el.querySelector('table');
    this.button = this.el.querySelector('button');

    this.renderGraph();
    this.collection.onUpdate(()=>this.renderGraph());

    this.button.addEventListener('click', (e) => {
      let atom = this.graph.addNode();
      this.collection.writeAndUpdate([atom]);
    });
  }

  renderGraph() {
    let g = this.graph.evaluate();

    let headers = g.nodes.map((uuid) => `<th>${uuid}</th>`).join('');
    let header = `<tr><th></th>${headers}</tr>`;

    let rows = g.nodes.map(from=>{
      return `<tr><td>${from}</td>` +
        g.nodes.map(to=> {
          if (g.outgoing[from] && g.outgoing[from].indexOf(to) !== -1) {
            return '<td>x</td>';
          } else {
            return '<td> </td>';
          }
        }).join('');
        + `</tr>`
    });

    this.table.innerHTML = header + rows.join('');
  }
}
