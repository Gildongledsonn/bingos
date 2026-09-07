class Cartela5x5 {
  constructor(numero, dono = null, celular = null, numeros = null) {
    this.numero = numero;
    this.modelo = "5x5";
    this.dono = dono;
    this.celular = celular;
    this.numeros = numeros || this.gerarNumeros();
  }

  gerarNumeros() {
    const colunasQtd = 5;
    const linhasQtd = 5; // 5 linhas preenchendo exatamente 25 números
    const tamanhoFaixa = 15;
    let cartelaMatriz = [];

    for (let c = 0; c < colunasQtd; c++) {
      const inicio = c * tamanhoFaixa + 1;
      const fim = (c + 1) * tamanhoFaixa;
      const faixa = [];
      for (let n = inicio; n <= fim; n++) faixa.push(n);

      for (let i = faixa.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [faixa[i], faixa[j]] = [faixa[j], faixa[i]];
      }
      cartelaMatriz.push(faixa.slice(0, linhasQtd).sort((a, b) => a - b));
    }

    let listaPorLinhas = [];
    for (let r = 0; r < linhasQtd; r++) {
      for (let c = 0; c < colunasQtd; c++) {
        listaPorLinhas.push(cartelaMatriz[c][r]);
      }
    }
    return listaPorLinhas;
  }

  renderizarGrid(setSorteados, ehDisponivel = false) {
    const letras = ['B', 'I', 'N', 'G', 'O'];
    let html = `<div class="cartela-linha">${letras.map(l => `<span class="coluna-letra">${l}</span>`).join('')}</div>`;

    for (let l = 0; l < 5; l++) {
      let linhaItens = "";
      for (let c = 0; c < 5; c++) {
        const val = this.numeros[l * 5 + c];
        if (ehDisponivel) {
          linhaItens += `<span class="pedra pedra-livre">${val}</span>`;
        } else {
          const marcada = setSorteados.has(val);
          const estilo = marcada ? ` style="background:${corDoNumero(val)};border-color:${corDoNumero(val)}"` : "";
          linhaItens += `<span class="pedra${marcada ? " pedra-marcada" : ""}"${estilo}>${val}</span>`;
        }
      }
      html += `<div class="cartela-linha">${linhaItens}</div>`;
    }
    return html;
  }

  renderizarHtml(setSorteados) {
    const totalNecessario = 25;
    if (!this.dono) {
      return `
        <button class="cartela cartela-disponivel" onclick="app.abrirEscolha(${this.numero})">
          <div class="cartela-cabecalho">
            <span class="cartela-numero">Nº ${this.numero} (5x5)</span>
            <span class="tag-disponivel">Disponível</span>
          </div>
          <div class="cartela-linhas">${this.renderizarGrid(setSorteados, true)}</div>
          <span class="cta-escolher">Escolher esta cartela</span>
        </button>`;
    }

    const marcados = this.numeros.filter(n => setSorteados.has(n)).length;
    const completa = marcados >= totalNecessario;
    const quase = marcados === totalNecessario - 1;

    let selo = "";
    if (completa) selo = '<div class="selo-bingo">BINGO!</div>';
    else if (quase) selo = '<div class="selo-quase">POR 1 PEDRA!</div>';

    return `
      <div class="cartela${completa ? " cartela-completa" : quase ? " cartela-quase" : ""}">
        <div class="cartela-cabecalho">
          <span class="cartela-numero">Nº ${this.numero}</span>
          <span class="cartela-dono">${escapeHtml(this.dono)}</span>
        </div>
        <div class="cartela-linhas">${this.renderizarGrid(setSorteados, false)}</div>
        <div class="cartela-rodape">
          <div class="barra-progresso"><div class="barra-preenchida" style="width:${(marcados / totalNecessario) * 100}%"></div></div>
          <span>${marcados}/${totalNecessario}</span>
        </div>
        ${selo}
      </div>`;
  }
}