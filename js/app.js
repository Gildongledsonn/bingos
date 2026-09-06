// ===================== Painel de Bingo — lógica standalone =====================
// Não depende de nenhuma biblioteca externa. Funciona em qualquer host estático.
// Persistência via localStorage (funciona no navegador/dispositivo em que o app é usado;
// veja o README.md sobre a limitação de sincronização entre dispositivos diferentes).

const TOTAL_BOLAS = 90;
const NUMEROS_POR_CARTELA = 15;
const TOTAL_CARTELAS = 1000;
const PAGINA = 60;
const COLUNA_COR = [
  "#8E4A3A", "#B5772F", "#A98A2A", "#5B7A3A", "#2F7A63",
  "#2F6E7A", "#3A5B8E", "#5B4A8E", "#7A3A6E",
];
function corDoNumero(n) {
  const idx = Math.min(8, Math.floor((n - 1) / 10));
  return COLUNA_COR[idx];
}

const K = {
  cards: "bingo-cartelas",
  drawn: "bingo-sorteados",
  winners: "bingo-ganhadores",
  auth: "bingo-admin-auth",
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Não foi possível salvar no armazenamento local:", e);
  }
}

function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function hashTexto(txt) {
  if (window.crypto && window.crypto.subtle) {
    try {
      const enc = new TextEncoder().encode(txt);
      const buf = await window.crypto.subtle.digest("SHA-256", enc);
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      // segue para o fallback abaixo
    }
  }
  // fallback simples (não criptográfico) para contextos sem HTTPS/SubtleCrypto
  let hash = 0;
  for (let i = 0; i < txt.length; i++) hash = (hash * 31 + txt.charCodeAt(i)) >>> 0;
  return "fallback-" + hash.toString(16);
}

// ---------- geração das cartelas ----------
function sortear15(usados) {
  let numeros, chave;
  do {
    const baralho = Array.from({ length: TOTAL_BOLAS }, (_, i) => i + 1);
    for (let i = baralho.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
    }
    numeros = baralho.slice(0, NUMEROS_POR_CARTELA).sort((a, b) => a - b);
    chave = numeros.join(",");
  } while (usados.has(chave));
  usados.add(chave);
  return numeros;
}
function gerarPool(qtd = TOTAL_CARTELAS) {
  const usados = new Set();
  const lista = [];
  for (let i = 1; i <= qtd; i++) lista.push({ numero: i, dono: null, numeros: sortear15(usados) });
  return lista;
}

// ---------- estado global ----------
const state = {
  papel: null,        // null | 'jogador' | 'operador'
  logado: false,       // sessão do operador (reseta ao recarregar a página)
  aba: "chamada",
  cartelas: [],
  sorteados: [],
  ganhadores: [],
  ganhadoresIds: new Set(),
  modalNumero: null,
  nomeClaim: "",
  erroClaim: "",
  apagarAberto: false,
  confirmacao: null,   // { mensagem, acao, perigo }
  filtroCartelas: "todas",
  buscaCartelas: "",
  visiveisCartelas: PAGINA,
  buscaAdmin: "",
  visiveisAdmin: PAGINA,
  usuarioAuth: "",
  erroAuth: "",
};

function init() {
  state.cartelas = loadJSON(K.cards, []);
  if (!state.cartelas || state.cartelas.length === 0) {
    state.cartelas = gerarPool();
    saveJSON(K.cards, state.cartelas);
  }
  state.sorteados = loadJSON(K.drawn, []);
  state.ganhadores = loadJSON(K.winners, []);
  state.ganhadoresIds = new Set(state.ganhadores.map((g) => g.numero));
  render();
}

// sincroniza entre abas abertas no MESMO navegador/dispositivo
window.addEventListener("storage", (e) => {
  if (![K.cards, K.drawn, K.winners].includes(e.key)) return;
  state.cartelas = loadJSON(K.cards, state.cartelas);
  state.sorteados = loadJSON(K.drawn, state.sorteados);
  state.ganhadores = loadJSON(K.winners, state.ganhadores);
  state.ganhadoresIds = new Set(state.ganhadores.map((g) => g.numero));
  render();
});

function checarGanhadores() {
  const setSorteados = new Set(state.sorteados);
  const novos = [];
  state.cartelas.forEach((c) => {
    if (!c.dono || state.ganhadoresIds.has(c.numero)) return;
    if (c.numeros.every((n) => setSorteados.has(n))) {
      state.ganhadoresIds.add(c.numero);
      novos.push({ numero: c.numero, dono: c.dono, hora: new Date().toLocaleTimeString("pt-BR") });
    }
  });
  if (novos.length) {
    state.ganhadores = [...state.ganhadores, ...novos];
    saveJSON(K.winners, state.ganhadores);
  }
}

// ===================== ações =====================

function escolherPapel(papel) {
  state.papel = papel;
  state.erroAuth = "";
  render();
}
function voltarEscolhaPapel() {
  state.papel = null;
  render();
}

async function criarLogin() {
  const usuario = (document.getElementById("auth-usuario").value || "").trim();
  const senha = document.getElementById("auth-senha").value || "";
  const confirmar = document.getElementById("auth-confirmar").value || "";
  if (!usuario || !senha) { state.erroAuth = "Preencha usuário e senha."; state.usuarioAuth = usuario; render(); return; }
  if (senha.length < 4) { state.erroAuth = "Use uma senha com pelo menos 4 caracteres."; state.usuarioAuth = usuario; render(); return; }
  if (senha !== confirmar) { state.erroAuth = "As senhas não coincidem."; state.usuarioAuth = usuario; render(); return; }
  const hash = await hashTexto(senha);
  saveJSON(K.auth, { usuario, hash });
  state.logado = true;
  state.erroAuth = "";
  render();
}

async function fazerLogin() {
  const usuario = (document.getElementById("auth-usuario").value || "").trim();
  const senha = document.getElementById("auth-senha").value || "";
  const auth = loadJSON(K.auth, null);
  if (!auth) { state.erroAuth = "Nenhum login cadastrado ainda."; render(); return; }
  const hash = await hashTexto(senha);
  if (usuario.toLowerCase() === String(auth.usuario).toLowerCase() && hash === auth.hash) {
    state.logado = true;
    state.erroAuth = "";
    render();
  } else {
    state.usuarioAuth = usuario;
    state.erroAuth = "Usuário ou senha incorretos.";
    render();
  }
}

function sairOperador() {
  state.logado = false;
  state.papel = null;
  render();
}

function marcarBola(n) {
  if (state.sorteados.includes(n)) return;
  state.sorteados = [...state.sorteados, n];
  saveJSON(K.drawn, state.sorteados);
  checarGanhadores();
  render();
}

function abrirApagar() { state.apagarAberto = true; render(); }
function fecharApagar() { state.apagarAberto = false; render(); }

function removerNumero(n) {
  state.sorteados = state.sorteados.filter((x) => x !== n);
  saveJSON(K.drawn, state.sorteados);
  const setSorteados = new Set(state.sorteados);
  const porNumero = {};
  state.cartelas.forEach((c) => (porNumero[c.numero] = c));
  const validos = state.ganhadores.filter((g) => {
    const c = porNumero[g.numero];
    return !c || c.numeros.every((num) => setSorteados.has(num));
  });
  if (validos.length !== state.ganhadores.length) {
    state.ganhadores = validos;
    state.ganhadoresIds = new Set(validos.map((g) => g.numero));
    saveJSON(K.winners, validos);
  }
  render();
}

function pedirReiniciar() {
  state.confirmacao = {
    mensagem: "Reiniciar a partida? As bolas sorteadas e os ganhadores serão apagados. As cartelas e quem escolheu cada uma permanecem.",
    acao: "reiniciar",
    perigo: false,
  };
  render();
}
function pedirGerarPool() {
  state.confirmacao = {
    mensagem: `Isso apaga TODAS as ${TOTAL_CARTELAS} cartelas, quem escolheu cada uma, as bolas sorteadas e os ganhadores, gerando um novo baralho do zero. Deseja continuar?`,
    acao: "gerarPool",
    perigo: true,
  };
  render();
}
function cancelarConfirmacao() { state.confirmacao = null; render(); }
function confirmarAcaoPendente() {
  if (!state.confirmacao) return;
  if (state.confirmacao.acao === "reiniciar") {
    state.sorteados = [];
    state.ganhadores = [];
    state.ganhadoresIds = new Set();
    saveJSON(K.drawn, []);
    saveJSON(K.winners, []);
  } else if (state.confirmacao.acao === "gerarPool") {
    state.cartelas = gerarPool();
    state.sorteados = [];
    state.ganhadores = [];
    state.ganhadoresIds = new Set();
    saveJSON(K.cards, state.cartelas);
    saveJSON(K.drawn, []);
    saveJSON(K.winners, []);
  }
  state.confirmacao = null;
  render();
}

function abrirEscolha(numero) {
  state.modalNumero = numero;
  state.nomeClaim = "";
  state.erroClaim = "";
  render();
}
function fecharEscolha() { state.modalNumero = null; render(); }

function confirmarEscolha() {
  const input = document.getElementById("input-nome-claim");
  const nome = input ? input.value.trim() : "";
  state.nomeClaim = nome;
  if (!nome) { state.erroClaim = "Informe o nome de quem está escolhendo a cartela."; render(); return; }
  const atuais = loadJSON(K.cards, state.cartelas);
  const idx = atuais.findIndex((c) => c.numero === state.modalNumero);
  if (idx < 0) { state.erroClaim = "Essa cartela não existe mais."; render(); return; }
  if (atuais[idx].dono) {
    state.cartelas = atuais;
    state.erroClaim = `Essa cartela já foi escolhida por ${atuais[idx].dono}. Escolha outra, por favor.`;
    render();
    return;
  }
  atuais[idx] = { ...atuais[idx], dono: nome };
  state.cartelas = atuais;
  saveJSON(K.cards, atuais);
  checarGanhadores();
  state.modalNumero = null;
  render();
}

function setFiltroCartelas(f) { state.filtroCartelas = f; state.visiveisCartelas = PAGINA; render(); }
function filtrarCartelasBusca(valor) {
  state.buscaCartelas = valor.replace(/[^0-9]/g, "");
  state.visiveisCartelas = PAGINA;
  const el = document.getElementById("resultado-cartelas");
  if (el) el.innerHTML = htmlResultadoCartelas();
}
function carregarMaisCartelas() {
  state.visiveisCartelas += PAGINA;
  const el = document.getElementById("resultado-cartelas");
  if (el) el.innerHTML = htmlResultadoCartelas();
}

function liberarCartela(numero) {
  state.cartelas = state.cartelas.map((c) => (c.numero === numero ? { ...c, dono: null } : c));
  saveJSON(K.cards, state.cartelas);
  state.ganhadoresIds.delete(numero);
  render();
}
function salvarDono(numero, novoNome) {
  const nome = (novoNome || "").trim();
  const atual = state.cartelas.find((c) => c.numero === numero);
  if (atual && (atual.dono || "") === nome) return; // nada mudou
  state.cartelas = state.cartelas.map((c) => (c.numero === numero ? { ...c, dono: nome || null } : c));
  saveJSON(K.cards, state.cartelas);
  checarGanhadores();
  render();
}
function buscarAdmin(valor) {
  state.buscaAdmin = valor;
  state.visiveisAdmin = PAGINA;
  const el = document.getElementById("resultado-admin");
  if (el) el.innerHTML = htmlResultadoAdmin();
}
function carregarMaisAdmin() {
  state.visiveisAdmin += PAGINA;
  const el = document.getElementById("resultado-admin");
  if (el) el.innerHTML = htmlResultadoAdmin();
}
function setAba(aba) { state.aba = aba; render(); }

// ===================== renderização =====================

function render() {
  const app = document.getElementById("app");
  if (state.papel === null) {
    app.innerHTML = htmlEscolhaPapel();
  } else if (state.papel === "jogador") {
    app.innerHTML = htmlJogador();
  } else if (state.papel === "operador") {
    app.innerHTML = state.logado ? htmlOperador() : htmlAuth();
  }
  app.innerHTML += htmlModais();
}

function htmlEscolhaPapel() {
  return `
    <div class="tela-escolha-papel">
      <div class="escolha-cabecalho">
        <span class="bola-logo bola-logo-grande">B</span>
        <h1>Painel de Bingo</h1>
        <p>Como você vai usar o app agora?</p>
      </div>
      <div class="escolha-cartoes">
        <button class="escolha-cartao" onclick="escolherPapel('jogador')">
          <span class="escolha-emoji">🎟️</span>
          <span class="escolha-titulo">Sou jogador</span>
          <span class="escolha-descricao">Escolher minha cartela e acompanhar a partida</span>
        </button>
        <button class="escolha-cartao" onclick="escolherPapel('operador')">
          <span class="escolha-emoji">🎙️</span>
          <span class="escolha-titulo">Sou o operador</span>
          <span class="escolha-descricao">Chamar os números e administrar as cartelas</span>
        </button>
      </div>
    </div>`;
}

function htmlAuth() {
  const existeLogin = !!loadJSON(K.auth, null);
  const usuarioValor = escapeHtml(state.usuarioAuth);
  if (!existeLogin) {
    return `
      <div class="tela-auth">
        <div class="form-auth">
          <h2>Criar login do operador</h2>
          <p class="subtitulo">Esse será o único login para acessar o chamador e a administração deste bingo. Guarde-o com cuidado — ele fica salvo apenas neste navegador.</p>
          <label>Usuário
            <input id="auth-usuario" value="${usuarioValor}" placeholder="Ex.: operador" />
          </label>
          <label>Senha
            <input id="auth-senha" type="password" placeholder="Mínimo 4 caracteres" />
          </label>
          <label>Confirmar senha
            <input id="auth-confirmar" type="password" placeholder="Repita a senha" onkeydown="if(event.key==='Enter') criarLogin()" />
          </label>
          ${state.erroAuth ? `<p class="erro">${escapeHtml(state.erroAuth)}</p>` : ""}
          <button class="btn-cadastrar" onclick="criarLogin()">Criar login e entrar</button>
          <button class="link-trocar-papel" onclick="voltarEscolhaPapel()">Voltar</button>
        </div>
      </div>`;
  }
  return `
    <div class="tela-auth">
      <div class="form-auth">
        <h2>Entrar como operador</h2>
        <p class="subtitulo">Informe o usuário e a senha cadastrados neste dispositivo.</p>
        <label>Usuário
          <input id="auth-usuario" value="${usuarioValor}" placeholder="Usuário" />
        </label>
        <label>Senha
          <input id="auth-senha" type="password" placeholder="Senha" onkeydown="if(event.key==='Enter') fazerLogin()" />
        </label>
        ${state.erroAuth ? `<p class="erro">${escapeHtml(state.erroAuth)}</p>` : ""}
        <button class="btn-cadastrar" onclick="fazerLogin()">Entrar</button>
        <button class="link-trocar-papel" onclick="voltarEscolhaPapel()">Voltar</button>
      </div>
    </div>`;
}

function htmlFaixaGanhadores() {
  if (!state.ganhadores.length) return "";
  return `<div class="faixa-ganhadores">${state.ganhadores.map((g) => `<span class="chip-ganhador">🏆 Cartela nº ${g.numero} — ${escapeHtml(g.dono)}</span>`).join("")}</div>`;
}

function htmlJogador() {
  const disponiveis = state.cartelas.filter((c) => !c.dono).length;
  const ultimaBola = state.sorteados[state.sorteados.length - 1];
  return `
    <div>
      <header class="topo topo-jogador">
        <div class="topo-titulo">
          <span class="bola-logo">B</span>
          <div>
            <h1>Escolha sua cartela</h1>
            <p>Toque em uma cartela disponível para reservar a sua</p>
          </div>
        </div>
        <div class="status-jogador">
          <div><strong>${ultimaBola ?? "—"}</strong><span>última bola</span></div>
          <div><strong>${state.sorteados.length}</strong><span>sorteadas</span></div>
          <div><strong>${disponiveis}</strong><span>disponíveis</span></div>
        </div>
      </header>
      ${htmlFaixaGanhadores()}
      <main class="conteudo">${htmlTelaCartelas()}</main>
      <button class="link-trocar-papel" onclick="voltarEscolhaPapel()">Sou o operador</button>
    </div>`;
}

function htmlOperador() {
  const auth = loadJSON(K.auth, null);
  return `
    <header class="topo">
      <div class="topo-titulo">
        <span class="bola-logo">B</span>
        <div>
          <h1>Painel de Bingo</h1>
          <p>90 números · ${TOTAL_CARTELAS} cartelas · chamada ao vivo</p>
        </div>
      </div>
      <nav class="abas">
        <button class="${state.aba === "chamada" ? "ativa" : ""}" onclick="setAba('chamada')">Chamador</button>
        <button class="${state.aba === "cartelas" ? "ativa" : ""}" onclick="setAba('cartelas')">Cartelas</button>
        <button class="${state.aba === "admin" ? "ativa" : ""}" onclick="setAba('admin')">Administração</button>
      </nav>
    </header>
    <div class="faixa-sessao">
      <span class="badge-sessao">Sessão: <strong>${escapeHtml(auth ? auth.usuario : "")}</strong></span>
      <button class="btn-sair" onclick="sairOperador()">Sair</button>
    </div>
    ${htmlFaixaGanhadores()}
    <main class="conteudo">
      ${state.aba === "chamada" ? htmlTelaChamada() : ""}
      ${state.aba === "cartelas" ? htmlTelaCartelas() : ""}
      ${state.aba === "admin" ? htmlTelaAdmin() : ""}
    </main>
    <button class="link-trocar-papel" onclick="voltarEscolhaPapel()">Trocar de painel</button>`;
}

function htmlTelaChamada() {
  const set = new Set(state.sorteados);
  const ultimaBola = state.sorteados[state.sorteados.length - 1];
  const disponiveis = state.cartelas.filter((c) => !c.dono).length;
  const bolas = Array.from({ length: TOTAL_BOLAS }, (_, i) => i + 1)
    .map((n) => {
      const marcada = set.has(n);
      const estilo = marcada ? ` style="background:${corDoNumero(n)};border-color:${corDoNumero(n)}"` : "";
      return `<button class="bola${marcada ? " marcada" : ""}"${estilo} onclick="marcarBola(${n})">${n}</button>`;
    })
    .join("");
  return `
    <div class="tela-chamada">
      <div class="painel-esquerda">
        <div class="bola-atual" style="border-color:${ultimaBola ? corDoNumero(ultimaBola) : "#3a3530"}">
          <span class="bola-atual-numero">${ultimaBola ?? "—"}</span>
          <span class="bola-atual-label">última bola</span>
        </div>
        <div class="resumo">
          <div><strong>${state.sorteados.length}</strong><span>sorteadas</span></div>
          <div><strong>${TOTAL_BOLAS - state.sorteados.length}</strong><span>restantes</span></div>
          <div><strong>${state.cartelas.length - disponiveis}</strong><span>escolhidas</span></div>
        </div>
        <p class="instrucao">Toque no número anunciado no globo para marcá-lo. Uma vez marcado, ele não pode ser desfeito por aqui — use o botão abaixo se marcar errado.</p>
        <button class="btn-apagar-numero" onclick="abrirApagar()">Apagar número</button>
        <button class="btn-reiniciar" onclick="pedirReiniciar()">Reiniciar partida</button>
      </div>
      <div class="grade-bolas">${bolas}</div>
    </div>`;
}

function htmlCartaoCartela(c, set) {
  if (!c.dono) {
    const linhas = [0, 1, 2]
      .map((linha) => `<div class="cartela-linha">${c.numeros.slice(linha * 5, linha * 5 + 5).map((n) => `<span class="pedra pedra-livre">${n}</span>`).join("")}</div>`)
      .join("");
    return `
      <button class="cartela cartela-disponivel" onclick="abrirEscolha(${c.numero})">
        <div class="cartela-cabecalho">
          <span class="cartela-numero">Nº ${c.numero}</span>
          <span class="tag-disponivel">Disponível</span>
        </div>
        <div class="cartela-linhas">${linhas}</div>
        <span class="cta-escolher">Escolher esta cartela</span>
      </button>`;
  }
  const marcados = c.numeros.filter((n) => set.has(n)).length;
  const completa = marcados === c.numeros.length;
  const linhas = [0, 1, 2]
    .map((linha) => `<div class="cartela-linha">${c.numeros
      .slice(linha * 5, linha * 5 + 5)
      .map((n) => {
        const marcada = set.has(n);
        const estilo = marcada ? ` style="background:${corDoNumero(n)};border-color:${corDoNumero(n)}"` : "";
        return `<span class="pedra${marcada ? " pedra-marcada" : ""}"${estilo}>${n}</span>`;
      })
      .join("")}</div>`)
    .join("");
  return `
    <div class="cartela${completa ? " cartela-completa" : ""}">
      <div class="cartela-cabecalho">
        <span class="cartela-numero">Nº ${c.numero}</span>
        <span class="cartela-dono">${escapeHtml(c.dono)}</span>
      </div>
      <div class="cartela-linhas">${linhas}</div>
      <div class="cartela-rodape">
        <div class="barra-progresso"><div class="barra-preenchida" style="width:${(marcados / c.numeros.length) * 100}%"></div></div>
        <span>${marcados}/${c.numeros.length}</span>
      </div>
      ${completa ? '<div class="selo-bingo">BINGO!</div>' : ""}
    </div>`;
}

function cartelasFiltradas() {
  return state.cartelas
    .filter((c) => (state.filtroCartelas === "disponiveis" ? !c.dono : state.filtroCartelas === "reservadas" ? !!c.dono : true))
    .filter((c) => (state.buscaCartelas ? String(c.numero).includes(state.buscaCartelas.trim()) : true));
}

function htmlResultadoCartelas() {
  const set = new Set(state.sorteados);
  const filtradas = cartelasFiltradas();
  if (!filtradas.length) return `<div class="vazio">Nenhuma cartela encontrada.</div>`;
  const paraExibir = filtradas.slice(0, state.visiveisCartelas);
  const grid = `<div class="grade-cartelas">${paraExibir.map((c) => htmlCartaoCartela(c, set)).join("")}</div>`;
  const carregarMais = state.visiveisCartelas < filtradas.length
    ? `<div class="carregar-mais-wrap"><button class="btn-carregar-mais" onclick="carregarMaisCartelas()">Carregar mais (${filtradas.length - state.visiveisCartelas} restantes)</button></div>`
    : "";
  return grid + carregarMais;
}

function htmlTelaCartelas() {
  const disponiveis = state.cartelas.filter((c) => !c.dono).length;
  return `
    <div>
      <div class="barra-filtros">
        <div class="filtro-botoes">
          <button class="${state.filtroCartelas === "todas" ? "ativo" : ""}" onclick="setFiltroCartelas('todas')">Todas (${state.cartelas.length})</button>
          <button class="${state.filtroCartelas === "disponiveis" ? "ativo" : ""}" onclick="setFiltroCartelas('disponiveis')">Disponíveis (${disponiveis})</button>
          <button class="${state.filtroCartelas === "reservadas" ? "ativo" : ""}" onclick="setFiltroCartelas('reservadas')">Escolhidas (${state.cartelas.length - disponiveis})</button>
        </div>
        <input class="busca-numero" value="${escapeHtml(state.buscaCartelas)}" oninput="filtrarCartelasBusca(this.value)" placeholder="Buscar nº da cartela" inputmode="numeric" />
      </div>
      <div id="resultado-cartelas">${htmlResultadoCartelas()}</div>
    </div>`;
}

function adminFiltradas() {
  const termo = state.buscaAdmin.trim().toLowerCase();
  return state.cartelas
    .filter((c) => (termo ? String(c.numero).includes(termo) || (c.dono || "").toLowerCase().includes(termo) : true))
    .sort((a, b) => a.numero - b.numero);
}

function htmlResultadoAdmin() {
  const filtradas = adminFiltradas();
  const paraExibir = filtradas.slice(0, state.visiveisAdmin);
  const linhas = paraExibir
    .map(
      (c) => `
      <tr>
        <td>${c.numero}</td>
        <td><input class="input-edicao" placeholder="— disponível —" value="${escapeHtml(c.dono)}" onblur="salvarDono(${c.numero}, this.value)" /></td>
        <td class="td-numeros">${c.numeros.join(", ")}</td>
        <td>${c.dono ? `<button class="btn-remover" onclick="liberarCartela(${c.numero})">Liberar</button>` : ""}</td>
      </tr>`
    )
    .join("");
  const carregarMais = state.visiveisAdmin < filtradas.length
    ? `<div class="carregar-mais-wrap"><button class="btn-carregar-mais" onclick="carregarMaisAdmin()">Carregar mais (${filtradas.length - state.visiveisAdmin} restantes)</button></div>`
    : "";
  return `
    <table>
      <thead><tr><th>Nº</th><th>Dono</th><th>Números</th><th></th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    ${carregarMais}`;
}

function htmlTelaAdmin() {
  const disponiveis = state.cartelas.filter((c) => !c.dono).length;
  return `
    <div class="tela-admin">
      <div class="admin-resumo">
        <h2>Baralho de cartelas</h2>
        <p>${state.cartelas.length} cartelas geradas · ${disponiveis} disponíveis · ${state.cartelas.length - disponiveis} escolhidas.</p>
        <button class="btn-perigo" onclick="pedirGerarPool()">Apagar tudo e gerar novo baralho de ${TOTAL_CARTELAS}</button>
      </div>
      <input class="busca-numero busca-admin" value="${escapeHtml(state.buscaAdmin)}" oninput="buscarAdmin(this.value)" placeholder="Buscar por número ou nome" />
      <div class="lista-cartelas" id="resultado-admin">${htmlResultadoAdmin()}</div>
    </div>`;
}

function htmlModais() {
  let html = "";

  if (state.modalNumero !== null) {
    const c = state.cartelas.find((x) => x.numero === state.modalNumero);
    if (c) {
      html += `
        <div class="modal-fundo" onclick="fecharEscolha()">
          <div class="modal-caixa" onclick="event.stopPropagation()">
            <h3>Escolher cartela nº ${c.numero}</h3>
            <div class="modal-numeros">${c.numeros.map((n) => `<span class="modal-pedra" style="border-color:${corDoNumero(n)}">${n}</span>`).join("")}</div>
            <label class="modal-label">Nome de quem está adquirindo
              <input id="input-nome-claim" value="${escapeHtml(state.nomeClaim)}" placeholder="Seu nome" onkeydown="if(event.key==='Enter') confirmarEscolha()" />
            </label>
            ${state.erroClaim ? `<p class="erro">${escapeHtml(state.erroClaim)}</p>` : ""}
            <div class="modal-botoes">
              <button class="btn-cancelar" onclick="fecharEscolha()">Cancelar</button>
              <button class="btn-cadastrar" onclick="confirmarEscolha()">Confirmar escolha</button>
            </div>
          </div>
        </div>`;
    }
  }

  if (state.apagarAberto) {
    const numeros = [...state.sorteados].sort((a, b) => a - b);
    html += `
      <div class="modal-fundo" onclick="fecharApagar()">
        <div class="modal-caixa" onclick="event.stopPropagation()">
          <h3>Apagar número</h3>
          <p class="modal-mensagem">Toque no número que foi marcado por engano para desfazer a marcação.</p>
          ${numeros.length === 0
            ? `<p class="modal-mensagem">Nenhuma bola marcada ainda.</p>`
            : `<div class="modal-numeros">${numeros.map((n) => `<button class="modal-pedra modal-pedra-clicavel" style="border-color:${corDoNumero(n)};background:${corDoNumero(n)}" onclick="removerNumero(${n})">${n} ✕</button>`).join("")}</div>`}
          <div class="modal-botoes">
            <button class="btn-cadastrar" onclick="fecharApagar()">Concluído</button>
          </div>
        </div>
      </div>`;
  }

  if (state.confirmacao) {
    html += `
      <div class="modal-fundo" onclick="cancelarConfirmacao()">
        <div class="modal-caixa" onclick="event.stopPropagation()">
          <h3>${state.confirmacao.perigo ? "Atenção" : "Confirmar"}</h3>
          <p class="modal-mensagem">${escapeHtml(state.confirmacao.mensagem)}</p>
          <div class="modal-botoes">
            <button class="btn-cancelar" onclick="cancelarConfirmacao()">Cancelar</button>
            <button class="${state.confirmacao.perigo ? "btn-perigo btn-perigo-cheio" : "btn-cadastrar"}" onclick="confirmarAcaoPendente()">${state.confirmacao.perigo ? "Sim, apagar tudo" : "Confirmar"}</button>
          </div>
        </div>
      </div>`;
  }

  return html;
}

document.addEventListener("DOMContentLoaded", init);
