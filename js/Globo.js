export class Globo {
  constructor(totalBolas = 90) {
    this.totalBolas = totalBolas;
    this.sorteados = [];
  }

  carregar(sorteados) {
    this.sorteados = Array.isArray(sorteados) ? [...sorteados] : [];
  }

  sortear(n) {
    if (!this.sorteados.includes(n)) {
      this.sorteados.push(n);
    }
  }

  apagar(n) {
    this.sorteados = this.sorteados.filter(bola => bola !== n);
  }

  reiniciar() {
    this.sorteados = [];
  }

  getUltima() {
    return this.sorteados[this.sorteados.length - 1] || null;
  }

  contem(n) {
    return this.sorteados.includes(n);
  }
}
```[cite: 2]

---

### 3. `js/Cartela.js`
```javascript
export class Cartela {
  constructor(numero, dono = null, celular = null) {
    this.numero = numero;
    this.dono = dono;
    this.celular = celular;
    this.numeros = [];
  }

  reservar(nome, celular) {
    this.dono = nome;
    this.celular = celular;
  }

  liberar() {
    this.dono = null;
    this.celular = null;
  }

  estaCompleta(sorteadosSet, totalNecessario) {
    if (!this.dono || this.numeros.length === 0) return false;
    const marcados = this.numeros.filter(n => sorteadosSet.has(n)).length;
    return marcados >= totalNecessario;
  }

  contarMarcados(sorteadosSet) {
    return this.numeros.filter(n => sorteadosSet.has(n)).length;
  }
}
```[cite: 2]

---

### 4. `js/Cartela5x3.js`
```javascript
import { Cartela } from './Cartela.js';

export class Cartela5x3 extends Cartela {
  constructor(numero, dono, celular) {
    super(numero, dono, celular);
    this.linhas = 3;
    this.colunas = 5;
  }

  gerarNumeros(usadosSet) {
    const faixas = [
      { inicio: 1, fim: 18 },   // B
      { inicio: 19, fim: 36 },  // I
      { inicio: 37, fim: 54 },  // N
      { inicio: 55, fim: 72 },  // G
      { inicio: 73, fim: 90 }   // O
    ];

    let chave;
    let matrizColunas;

    do {
      matrizColunas = [];
      for (let c = 0; c < 5; c++) {
        const f = faixas[c];
        const faixa = [];
        for (let n = f.inicio; n <= f.fim; n++) faixa.push(n);

        for (let i = faixa.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [faixa[i], faixa[j]] = [faixa[j], faixa[i]];
        }

        const escolhidos = faixa.slice(0, 3).sort((a, b) => a - b);
        matrizColunas.push(escolhidos);
      }

      let listaPorLinhas = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) {
          listaPorLinhas.push(matrizColunas[c][r]);
        }
      }

      chave = listaPorLinhas.join(",");
      if (!usadosSet.has(chave)) {
        usadosSet.add(chave);
        this.numeros = listaPorLinhas;
        break;
      }
    } while (true);
  }
}
```[cite: 2]

---

### 5. `js/Cartela5x5.js`
```javascript
import { Cartela } from './Cartela.js';

export class Cartela5x5 extends Cartela {
  constructor(numero, dono, celular) {
    super(numero, dono, celular);
    this.linhas = 5;
    this.colunas = 5;
  }

  gerarNumeros(usadosSet) {
    const tamanhoFaixa = 15;
    let chave;
    let matrizColunas;

    do {
      matrizColunas = [];
      for (let c = 0; c < 5; c++) {
        const inicio = c * tamanhoFaixa + 1;
        const fim = (c + 1) * tamanhoFaixa;
        
        const faixa = [];
        for (let n = inicio; n <= fim; n++) faixa.push(n);

        for (let i = faixa.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [faixa[i], faixa[j]] = [faixa[j], faixa[i]];
        }

        const escolhidos = faixa.slice(0, 5).sort((a, b) => a - b);
        matrizColunas.push(escolhidos);
      }

      let listaPorLinhas = [];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          listaPorLinhas.push(matrizColunas[c][r]);
        }
      }

      chave = listaPorLinhas.join(",");
      if (!usadosSet.has(chave)) {
        usadosSet.add(chave);
        this.numeros = listaPorLinhas;
        break;
      }
    } while (true);
  }
}
```[cite: 2]

---

### 6. `js/GerenciadorCartelas.js`
```javascript
import { Cartela5x3 } from './Cartela5x3.js';
import { Cartela5x5 } from './Cartela5x5.js';

export class GerenciadorCartelas {
  constructor(modelo = "5x3", total = 1000) {
    this.modelo = modelo;
    this.total = total;
    this.cartelas = [];
  }

  carregar(dadosSalvos) {
    const usadosSet = new Set();
    this.cartelas = dadosSalvos.map(item => {
      let c = this.modelo === "5x5" 
        ? new Cartela5x5(item.numero, item.dono, item.celular)
        : new Cartela5x3(item.numero, item.dono, item.celular);
      
      c.numeros = item.numeros || [];
      usadosSet.add(c.numeros.join(","));
      return c;
    });
  }

  gerarPoolNovo() {
    const usadosSet = new Set();
    this.cartelas = [];
    for (let i = 1; i <= this.total; i++) {
      let c = this.modelo === "5x5" ? new Cartela5x5(i) : new Cartela5x3(i);
      c.gerarNumeros(usadosSet);
      this.cartelas.push(c);
    }
  }

  buscarPorNumero(num) {
    return this.cartelas.find(c => c.numero === Number(num));
  }
}
```[cite: 2]

---

### 7. `js/app.js` (Orquestrador principal e interface)