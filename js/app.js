const COLUNA_COR = [
  "#8E4A3A", "#B5772F", "#A98A2A", "#5B7A3A", "#2F7A63",
  "#2F6E7A", "#3A5B8E", "#5B4A8E", "#7A3A6E",
];

function corDoNumero(n) {
  const idx = Math.min(8, Math.floor((n - 1) / 10));
  return COLUNA_COR[idx];
}

class BingoApp {
  constructor() {
    this.sala = "geral";
    this.modeloSala = "5x3";
    this.papel = null;
    this.tipoOperador = null;
    this.usuarioLogado = "";
    this.aba = "chamada";
    this.cartelas = [];
    this.sorteados = [];
    this.ganhadores = [];
    this.ganhadoresIds = new Set();
    this.modalNumero = null;
    this.nomeClaim = "";
    this.celularClaim = "";
    this.erroClaim = "";
    this.filtroCartelas = "todas";
    this.visiveisCartelas = 24; // Paginação para o jogador
    this.buscaAdmin = "";
    this.visiveisAdmin = 60;
    this.inputSala = "";
    this.inputModelo = "5x3";
    this.erroAuth = "";
    this.novoChamadorUser = "";
    this.novoChamadorPass = "";
    this.erroChamador = "";

    // Campos de Impressão A4
    this.impressaoCartelaId = 1;
    this.impPremio1 = "1º Prêmio: R$ 500,00";
    this.impPremio2 = "2º Prêmio: R$ 1.000,00";
    this.impPremio3 = "3º Prêmio: R$ 1.500,00";
    this.impPremio4 = "4º Prêmio: R$ 2.000,00";
    this.impValorCartela = "R$ 10,00";
    this.impAtracoes = "Música ao vivo e sorteios extras";
    this.impEmpresa = "GAF Treinamentos / Natal-RN";
  }

  async init() {
    await this.initMasterAdmin();
    this.carregarDadosSala();
    this.render();
  }

  async initMasterAdmin() {
    let chamadores = loadJSON("bingo-chamadores-autorizados", null);
    if (!chamadores) {
      const hash = await hashTexto("159753@bingos");
      saveJSON("bingo-chamadores-autorizados", [{ usuario: "Gildongledson", hash, master: true }]);
    }
  }

  carregarDadosSala() {
    const s = (this.sala || "geral").toLowerCase().trim();
    this.modeloSala = loadJSON(`bingo-modelo-${s}`, "5x3");
    const rawCards = loadJSON(`bingo-cartelas-${s}`, []);

    if (!rawCards || rawCards.length === 0 || rawCards[0].modelo !== this.modeloSala) {
      this.cartelas = [];
      for (let i = 1; i <= 1000; i++) {
        if (this.modeloSala === "5x5") {
          this.cartelas.push(new Cartela5x5(i));
        } else {
          this.cartelas.push(new Cartela5x3(i));
        }
      }
      this.salvarEstadoSala();
    } else {
      this.cartelas = rawCards.map(c => {
        if (this.modeloSala === "5x5" || c.modelo === "5x5") {
          return new Cartela5x5(c.numero, c.dono, c.celular, c.numeros);
        }
        return new Cartela5x3(c.numero, c.dono, c.celular, c.numeros);
      });
    }
    this.sorteados = loadJSON(`bingo-sorteados-${s}`, []);
    this.ganhadores = loadJSON(`bingo-ganhadores-${s}`, []);
    this.ganhadoresIds = new Set(this.ganhadores.map(g => g.numero));
  }

  salvarEstadoSala() {
    const s = (this.sala || "geral").toLowerCase().trim();
    saveJSON(`bingo-cartelas-${s}`, this.cartelas);
    saveJSON(`bingo-sorteados-${s}`, this.sorteados);
    saveJSON(`bingo-ganhadores-${s}`, this.ganhadores);
    saveJSON(`bingo-modelo-${s}`, this.modeloSala);
  }

  entrarNaSala(papel) {
    const input = document.getElementById("input-nome-sala");
    const selectModelo = document.getElementById("select-modelo-cartela");
    this.sala = (input ? input.value : this.inputSala).trim() || "geral";
    this.modeloSala = selectModelo ? selectModelo.value : this.inputModelo;

    saveJSON(`bingo-modelo-${this.sala.toLowerCase().trim()}`, this.modeloSala);
    this.carregarDadosSala();
    this.papel = papel;
    this.render();
  }

  voltarEscolhaPapel() {
    this.papel = null;
    this.tipoOperador = null;
    this.usuarioLogado = "";
    this.render();
  }

  async fazerLoginOperador() {
    const usuario = (document.getElementById("auth-usuario")?.value || "").trim();
    const senha = document.getElementById("auth-senha")?.value || "";
    const hash = await hashTexto(senha);
    const chamadores = loadJSON("bingo-chamadores-autorizados", []);
    const encontrado = chamadores.find(c => c.usuario.toLowerCase() === usuario.toLowerCase() && c.hash === hash);

    if (encontrado) {
      this.usuarioLogado = encontrado.usuario;
      this.tipoOperador = encontrado.master ? "master" : "chamador";
      this.aba = "chamada";
      this.render();
    } else {
      this.erroAuth = "Usuário ou senha incorretos.";
      this.render();
    }
  }

  async adicionarChamador() {
    const u = (document.getElementById("novo-chamador-user")?.value || "").trim();
    const s = document.getElementById("novo-chamador-pass")?.value || "";
    if (!u || !s) {
      this.erroChamador = "Preencha usuário e senha.";
      this.render();
      return;
    }
    const hash = await hashTexto(s);
    let chamadores = loadJSON("bingo-chamadores-autorizados", []);
    if (chamadores.some(c => c.usuario.toLowerCase() === u.toLowerCase())) {
      this.erroChamador = "Usuário já existe.";
      this.render();
      return;
    }
    chamadores.push({ usuario: u, hash, master: false });
    saveJSON("bingo-chamadores-autorizados", chamadores);
    this.novoChamadorUser = "";
    this.novoChamadorPass = "";
    this.erroChamador = "";
    this.render();
  }

  removerChamador(usuario) {
    if (usuario.toLowerCase() === "gildongledson") return;
    let chamadores = loadJSON("bingo-chamadores-autorizados", []);
    chamadores = chamadores.filter(c => c.usuario.toLowerCase() !== usuario.toLowerCase());
    saveJSON("bingo-chamadores-autorizados", chamadores);
    this.render();
  }

  marcarBola(n) {
    if (this.sorteados.includes(n)) return;
    this.sorteados.push(n);
    this.checarGanhadores();
    this.salvarEstadoSala();
    this.render();
  }

  checarGanhadores() {
    const setSorteados = new Set(this.sorteados);
    const totalNecessario = this.modeloSala === "5x5" ? 25 : 15;
    
    this.cartelas.forEach((c) => {
      if (!c.dono || this.ganhadoresIds.has(c.numero)) return;
      if (c.numeros.every((n) => setSorteados.has(n))) {
        this.ganhadoresIds.add(c.numero);
        const tel = (c.celular || "").replace(/\D/g, "");
        this.ganhadores.push({
          numero: c.numero,
          dono: c.dono,
          celularUltimos4: tel.length >= 4 ? tel.slice(-4) : "0000",
          hora: new Date().toLocaleTimeString("pt-BR")
        });
      }
    });
  }

  render() {
    const appEl = document.getElementById("app");
    if (this.papel === null) appEl.innerHTML = this.htmlEscolhaPapel();
    else if (this.papel === "jogador") appEl.innerHTML = this.htmlJogador();
    else if (this.papel === "operador") appEl.innerHTML = this.tipoOperador ? this.htmlOperador() : this.htmlAuth();
    appEl.innerHTML += this.htmlModais();
  }

  htmlEscolhaPapel() {
    return `
      <div class="tela-escolha-papel">
        <div class="escolha-cabecalho">
          <span class="bola-logo bola-logo-grande">B</span>
          <h1>Painel de Bingo por Salas</h1>
          <p>Informe a sala e o modelo da cartela</p>
        </div>
        <div class="caixa-sala">
          <label>Nome da Sala
            <input id="input-nome-sala" value="${escapeHtml(this.inputSala || "sala1")}" oninput="app.inputSala=this.value" />
          </label>
          <label>Modelo
            <select id="select-modelo-cartela" onchange="app.inputModelo=this.value">
              <option value="5x3" ${this.inputModelo === '5x3' ? 'selected' : ''}>Cartela 5x3 (15 números / 90 bolas)</option>
              <option value="5x5" ${this.inputModelo === '5x5' ? 'selected' : ''}>Cartela 5x5 (25 números / 75 bolas)</option>
            </select>
          </label>
        </div>
        <div class="escolha-cartoes">
          <button class="escolha-cartao" onclick="app.entrarNaSala('jogador')">
            <span class="escolha-emoji">🎟️</span><span class="escolha-titulo">Sou jogador</span>
          </button>
          <button class="escolha-cartao" onclick="app.entrarNaSala('operador')">
            <span class="escolha-emoji">🎙️</span><span class="escolha-titulo">Sou operador</span>
          </button>
        </div>
      </div>`;
  }

  htmlAuth() {
    return `
      <div class="tela-auth">
        <div class="form-auth">
          <h2>Entrar na Sala: ${escapeHtml(this.sala)}</h2>
          <label>Usuário <input id="auth-usuario" /></label>
          <label>Senha <input id="auth-senha" type="password" onkeydown="if(event.key==='Enter') app.fazerLoginOperador()" /></label>
          ${this.erroAuth ? `<p class="erro">${escapeHtml(this.erroAuth)}</p>` : ""}
          <button class="btn-cadastrar" onclick="app.fazerLoginOperador()">Entrar</button>
          <button class="link-trocar-papel" onclick="app.voltarEscolhaPapel()">Voltar</button>
        </div>
      </div>`;
  }

  htmlFaixaGanhadores() {
    if (!this.ganhadores.length) return "";
    return `<div class="faixa-ganhadores">${this.ganhadores.map(g => `<span class="chip-ganhador">🏆 Nº ${g.numero} — ${escapeHtml(g.dono)} (...${g.celularUltimos4})</span>`).join("")}</div>`;
  }

  htmlJogador() {
    const disponiveis = this.cartelas.filter(c => !c.dono).length;
    const ultima = this.sorteados[this.sorteados.length - 1];
    return `
      <div>
        <header class="topo topo-jogador">
          <div class="topo-titulo">
            <span class="bola-logo">B</span>
            <div><h1>Sala: ${escapeHtml(this.sala)} (${this.modeloSala})</h1><p>Escolha sua cartela</p></div>
          </div>
          <div class="status-jogador">
            <div><strong>${ultima ?? "—"}</strong><span>última</span></div>
            <div><strong>${this.sorteados.length}</strong><span>sorteadas</span></div>
            <div><strong>${disponiveis}</strong><span>livres</span></div>
          </div>
        </header>
        ${this.htmlFaixaGanhadores()}
        <main class="conteudo">${this.htmlTelaCartelas()}</main>
        <button class="link-trocar-papel" onclick="app.voltarEscolhaPapel()">Trocar de sala</button>
      </div>`;
  }

  htmlOperador() {
    const isMaster = this.tipoOperador === "master";
    return `
      <header class="topo">
        <div class="topo-titulo"><span class="bola-logo">B</span><div><h1>Sala: ${escapeHtml(this.sala)} (${this.modeloSala})</h1></div></div>
        <nav class="abas">
          <button class="${this.aba === 'chamada' ? 'ativa' : ''}" onclick="app.aba='chamada'; app.render()">Chamador</button>
          <button class="${this.aba === 'cartelas' ? 'ativa' : ''}" onclick="app.aba='cartelas'; app.render()">Cartelas</button>
          ${isMaster ? `<button class="${this.aba === 'admin' ? 'ativa' : ''}" onclick="app.aba='admin'; app.render()">Admin & Impressão</button>` : ""}
        </nav>
      </header>
      <div class="faixa-sessao"><span class="badge-sessao">Logado: <strong>${escapeHtml(this.usuarioLogado)}</strong></span><button class="btn-sair" onclick="app.voltarEscolhaPapel()">Sair</button></div>
      ${this.htmlFaixaGanhadores()}
      <main class="conteudo">
        ${this.aba === 'chamada' ? this.htmlTelaChamada() : this.aba === 'cartelas' ? this.htmlTelaCartelas() : this.htmlTelaAdmin()}
      </main>`;
  }

  htmlTelaChamada() {
    const totalBolas = this.modeloSala === "5x5" ? 75 : 90;
    const set = new Set(this.sorteados);
    const ultima = this.sorteados[this.sorteados.length - 1];
    const bolas = Array.from({ length: totalBolas }, (_, i) => i + 1).map(n => {
      const marcada = set.has(n);
      return `<button class="bola${marcada ? " marcada" : ""}"${marcada ? ` style="background:${corDoNumero(n)}"` : ""} onclick="app.marcarBola(${n})">${n}</button>`;
    }).join("");

    return `
      <div class="tela-chamada">
        <div class="painel-esquerda">
          <div class="bola-atual"><span class="bola-atual-numero">${ultima ?? "—"}</span><span class="bola-atual-label">última</span></div>
          <div class="resumo"><div><strong>${this.sorteados.length}</strong><span>sorteadas</span></div><div><strong>${totalBolas - this.sorteados.length}</strong><span>restantes</span></div></div>
        </div>
        <div class="grade-bolas">${bolas}</div>
      </div>`;
  }

  htmlTelaCartelas() {
    const set = new Set(this.sorteados);
    const filtradas = this.cartelas.filter(c => {
      if (this.filtroCartelas === "disponiveis") return !c.dono;
      if (this.filtroCartelas === "reservadas") return !!c.dono;
      return true;
    });

    const paraExibir = filtradas.slice(0, this.visiveisCartelas);
    const grid = `<div class="grade-cartelas">${paraExibir.map(c => c.renderizarHtml(set)).join("")}</div>`;
    const carregarMais = this.visiveisCartelas < filtradas.length
      ? `<div class="carregar-mais-wrap"><button class="btn-cadastrar" onclick="app.visiveisCartelas += 24; app.render()">Carregar mais cartelas (${filtradas.length - this.visiveisCartelas} restantes)</button></div>`
      : "";

    return `
      <div>
        <div class="barra-filtros">
          <div class="filtro-botoes">
            <button class="${this.filtroCartelas === 'todas' ? 'ativa' : ''}" onclick="app.filtroCartelas='todas'; app.render()">Todas</button>
            <button class="${this.filtroCartelas === 'disponiveis' ? 'ativa' : ''}" onclick="app.filtroCartelas='disponiveis'; app.render()">Disponíveis</button>
            <button class="${this.filtroCartelas === 'reservadas' ? 'ativa' : ''}" onclick="app.filtroCartelas='reservadas'; app.render()">Escolhidas</button>
          </div>
        </div>
        ${grid}
        ${carregarMais}
      </div>`;
  }

 htmlTelaAdmin() {
    const chamadores = loadJSON("bingo-chamadores-autorizados", []);
    const listaChamadores = chamadores.map(c => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.15); padding:8px 12px; border-radius:8px; margin-bottom:6px;">
        <span><strong>${escapeHtml(c.usuario)}</strong> ${c.master ? '(Master)' : ''}</span>
        ${!c.master ? `<button class="btn-remover" onclick="app.removerChamador('${c.usuario}')">Remover</button>` : ''}
      </div>
    `).join("");

    return `
      <div class="tela-admin">
        <div class="admin-bloco">
          <h2>Gerenciar Chamadores Autorizados</h2>
          <div style="display:grid; grid-template-columns: 1fr 1fr auto; gap:8px; align-items:end;">
            <label>Usuário <input id="novo-chamador-user" value="${escapeHtml(this.novoChamadorUser)}" oninput="app.novoChamadorUser=this.value" /></label>
            <label>Senha <input id="novo-chamador-pass" type="password" value="${escapeHtml(this.novoChamadorPass)}" oninput="app.novoChamadorPass=this.value" /></label>
            <button class="btn-cadastrar" onclick="app.adicionarChamador()">Adicionar</button>
          </div>
          ${this.erroChamador ? `<p class="erro">${escapeHtml(this.erroChamador)}</p>` : ""}
          <div style="margin-top:10px;">${listaChamadores}</div>
        </div>

        <div class="admin-bloco">
          <h2>🖨️ Opção de Impressão A4 (Marca d'Água por Imagem)</h2>
          <p>Configure os prêmios e arraste/selecione uma imagem do seu computador para o fundo da folha.</p>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
            <label>Nº da Cartela Inicial <input type="number" min="1" max="1000" value="${this.impressaoCartelaId}" oninput="app.impressaoCartelaId=parseInt(this.value)||1" /></label>
            <label>1º Prêmio <input value="${escapeHtml(this.impPremio1)}" oninput="app.impPremio1=this.value" /></label>
            <label>2º Prêmio <input value="${escapeHtml(this.impPremio2)}" oninput="app.impPremio2=this.value" /></label>
            <label>3º Prêmio <input value="${escapeHtml(this.impPremio3)}" oninput="app.impPremio3=this.value" /></label>
            <label>4º Prêmio <input value="${escapeHtml(this.impPremio4)}" oninput="app.impPremio4=this.value" /></label>
            <label>Valor da Cartela <input value="${escapeHtml(this.impValorCartela)}" oninput="app.impValorCartela=this.value" /></label>
            <label>Atrações <input value="${escapeHtml(this.impAtracoes)}" oninput="app.impAtracoes=this.value" /></label>
            <label>Logomarca / Endereço <input value="${escapeHtml(this.impEmpresa)}" oninput="app.impEmpresa=this.value" /></label>
            
            <label style="grid-column: 1 / -1;">
              Arraste ou escolha a imagem de fundo (Marca d'água):
              <input type="file" accept="image/*" onchange="app.tratarArquivoImagem(event)" style="padding: 6px; background: rgba(255,255,255,0.08); border: 1px dashed #ccc; cursor: pointer; width: 100%;" />
            </label>
            ${this.impFotoUrl ? `<div style="grid-column: 1 / -1; font-size: 12px; color: #E7B84B;">✅ Imagem carregada com sucesso!</div>` : ""}
          </div>
          <button class="btn-cadastrar" style="margin-top:10px;" onclick="app.gerarImpressaoA4()">Salvar Cartelas em PDF</button>
        </div>
      </div>`;
  }

tratarArquivoImagem(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = (e) => {
      this.impFotoUrl = e.target.result; // Armazena a imagem convertida em Base64
      this.render();
    };
    leitor.readAsDataURL(arquivo);
  }

gerarImpressaoA4() {
    const inicio = parseInt(this.impressaoCartelaId) || 1;
    const quantidadeStr = prompt("Quantas cartelas DIFERENTES deseja gerar em PDF?", "10");
    if (!quantidadeStr) return;
    const quantidade = parseInt(quantidadeStr) || 10;

    const setVazio = new Set();
    let folhasHtml = "";
    const fotoUrl = this.impFotoUrl ? this.impFotoUrl.trim() : "";

    for (let i = 0; i < quantidade; i++) {
      const idCartelaAtual = inicio + i;
      const cartela = this.cartelas.find(c => c.numero === idCartelaAtual) || this.cartelas[0];
      const gridHtml = cartela.renderizarGrid(setVazio, true);
      const premios = [this.impPremio1, this.impPremio2, this.impPremio3, this.impPremio4];

      const criarQuadrante = (premioTexto, numPremio) => `
        <div class="quadrante">
          <div class="topo-imp">
            <h3>${escapeHtml(this.impEmpresa)}</h3>
            <p><strong>Cartela Nº ${cartela.numero}</strong> (${cartela.modelo})</p>
          </div>
          <div class="premios-imp">
            <p>🏆 ${numPremio}º Prêmio: ${escapeHtml(premioTexto.replace(/^[0-9]+º\s*Prêmio:\s*/i, ''))}</p>
          </div>
          <div class="conteudo-cartela">${gridHtml}</div>
          <div class="rodape-imp">
            <span>Valor: <strong>${escapeHtml(this.impValorCartela)}</strong></span>
            <span>Atrações: <strong>${escapeHtml(this.impAtracoes)}</strong></span>
          </div>
        </div>
      `;

      const cartela1 = criarQuadrante(premios[0], 1);
      const cartela2 = criarQuadrante(premios[1], 2);
      const cartela3 = criarQuadrante(premios[2], 3);
      const cartela4 = criarQuadrante(premios[3], 4);
      
      // Cartela de conferência para o lado esquerdo
      const cartelaCentro = `
        <div class="quadrante cartela-centro-estilo" style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%;">
          <div style="width: 100%;">
            <div style="text-align: center; font-size: 11px; font-weight: bold; margin-bottom: 8px; font-family: 'Fraunces', serif; color: #2F7A63;">CONFERÊNCIA — Cartela Nº ${cartela.numero}</div>
            <div class="conteudo-cartela">${gridHtml}</div>
          </div>
        </div>
      `;

      // Bloco da imagem para o lado direito
      const blocoImagem = fotoUrl 
        ? `<div class="bloco-imagem-lateral"><img src="${escapeHtml(fotoUrl)}" alt="Imagem Central" /></div>` 
        : `<div class="bloco-imagem-lateral sem-foto"><span>Sem Imagem Selecionada</span></div>`;

      folhasHtml += `
        <div class="folha-a4">
          <div class="pos top-left">${cartela1}</div>
          <div class="pos top-right">${cartela2}</div>
          
          <div class="pos centro-esq">${cartelaCentro}</div>
          <div class="pos centro-dir">${blocoImagem}</div>

          <div class="pos bottom-left">${cartela3}</div>
          <div class="pos bottom-right">${cartela4}</div>
        </div>
      `;
    }

    const janelaImp = window.open("", "_blank");
    janelaImp.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Salvar Cartelas em PDF</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          
          .folha-a4 { 
            position: relative;
            width: 210mm; 
            height: 297mm; 
            margin: 0 auto; 
            box-sizing: border-box; 
            padding: 8mm; 
            page-break-after: always; 
            background: #fff;
            overflow: hidden;
          }

          .pos {
            position: absolute;
            box-sizing: border-box;
            z-index: 2;
          }

          /* Organização simétrica das 4 cartelas nos cantos e o meio dividido em duas colunas */
          .top-left { top: 8mm; left: 8mm; width: 92mm; height: 93mm; }
          .top-right { top: 8mm; right: 8mm; width: 92mm; height: 93mm; }
          
          .centro-esq { top: 104mm; left: 8mm; width: 92mm; height: 90mm; }
          .centro-dir { top: 104mm; right: 8mm; width: 92mm; height: 90mm; display: flex; align-items: center; justify-content: center; }

          .bottom-left { bottom: 8mm; left: 8mm; width: 92mm; height: 93mm; }
          .bottom-right { bottom: 8mm; right: 8mm; width: 92mm; height: 93mm; }

          .bloco-imagem-lateral {
            width: 100%;
            height: 100%;
            border: 2px dashed #bbb;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fafafa;
            box-sizing: border-box;
            overflow: hidden;
            padding: 4mm;
          }

          .bloco-imagem-lateral img {
            width: 100%;
            height: 100%;
            object-fit: cover; /* Faz a imagem preencher todo o quadrante sem distorcer */
            border-radius: 4px;
          }

          .sem-foto span {
            font-size: 11px;
            color: #888;
            font-weight: bold;
          }

          .quadrante { 
            border: 1.5px dashed #444; 
            border-radius: 6px;
            padding: 5px 8mm; 
            display: flex; 
            flex-direction: column; 
            justify-content: space-between; 
            background: #fff; 
            box-sizing: border-box; 
            width: 100%; 
            height: 100%; 
          }

          .cartela-centro-estilo {
            border: 2px solid #2F7A63;
            background: #fff;
          }
          
          .topo-imp { text-align: center; border-bottom: 1px solid #333; padding-bottom: 1px; margin-bottom: 2px; }
          .topo-imp h3 { margin: 0; font-size: 11px; font-family: 'Fraunces', serif; }
          .topo-imp p { margin: 1px 0 0; font-size: 9px; color: #333; }
          
          .premios-imp { font-size: 9px; border: 1px solid #ccc; padding: 2px 4px; background: #f4efe2; text-align: center; font-weight: bold; border-radius: 3px; color: #2a2210; }
          .premios-imp p { margin: 0; }
          
          .conteudo-cartela { margin-top: 0.5cm; margin-bottom: 0.5cm; }
          
          .cartela-linha { display: flex; gap: 2px; margin-bottom: 2px; }
          .coluna-letra, .pedra { flex: 1; text-align: center; font-size: 10.5px; padding: 3px 0; border: 1px solid #d8cfb8; font-weight: bold; border-radius: 3px; }
          .coluna-letra { background: #e9e4d4; font-family: 'Fraunces', serif; color: #5c5340; padding: 2px 0; }
          .pedra { background: #fffdf8; color: #2a2210; }
          
          .rodape-imp { display: flex; justify-content: space-between; font-size: 8.5px; border-top: 1px solid #333; padding-top: 2px; color: #444; }

          @media print { 
            body { padding: 0; } 
            .folha-a4 { margin: 0; border: none; page-break-after: always; } 
          }
        </style>
      </head>
      <body>
        ${folhasHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 600);
          };
        <\/script>
      </body>
      </html>
    `);
    janelaImp.document.close();
  }

  abrirEscolha(numero) {
    this.modalNumero = numero;
    this.nomeClaim = "";
    this.celularClaim = "";
    this.erroClaim = "";
    this.render();
  }

  confirmarEscolha() {
    const nome = document.getElementById("input-nome-claim")?.value.trim() || "";
    const celular = document.getElementById("input-celular-claim")?.value.trim() || "";
    if (!nome || !celular) { this.erroClaim = "Preencha nome e celular."; this.render(); return; }

    const cartela = this.cartelas.find(c => c.numero === this.modalNumero);
    if (cartela && !cartela.dono) {
      cartela.dono = nome;
      cartela.celular = celular;
      this.checarGanhadores();
      this.salvarEstadoSala();
      this.modalNumero = null;
      this.render();
    }
  }

  htmlModais() {
    if (this.modalNumero === null) return "";
    const c = this.cartelas.find(x => x.numero === this.modalNumero);
    return `
      <div class="modal-fundo" onclick="app.modalNumero=null; app.render()">
        <div class="modal-caixa" onclick="event.stopPropagation()">
          <h3>Escolher cartela nº ${c.numero}</h3>
          <label class="modal-label">Nome Completo <input id="input-nome-claim" /></label>
          <label class="modal-label">Celular <input id="input-celular-claim" /></label>
          ${this.erroClaim ? `<p class="erro">${escapeHtml(this.erroClaim)}</p>` : ""}
          <div class="modal-botoes">
            <button class="btn-cancelar" onclick="app.modalNumero=null; app.render()">Cancelar</button>
            <button class="btn-cadastrar" onclick="app.confirmarEscolha()">Confirmar</button>
          </div>
        </div>
      </div>`;
  }
}

function loadJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}
function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
async function hashTexto(txt) {
  let hash = 0;
  for (let i = 0; i < txt.length; i++) hash = (hash * 31 + txt.charCodeAt(i)) >>> 0;
  return "fallback-" + hash.toString(16);
}

const app = new BingoApp();
document.addEventListener("DOMContentLoaded", () => app.init());