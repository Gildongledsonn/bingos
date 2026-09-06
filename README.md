# Painel de Bingo

App pronto para hospedar em qualquer servidor de arquivos estáticos (não precisa de
Node, PHP, banco de dados nem build). São só 3 arquivos: `index.html`, `css/style.css`
e `js/app.js`.

## Como hospedar

Basta subir a pasta inteira (mantendo a estrutura de pastas) para o seu host. Alguns
exemplos:

- **Hospedagem comum (cPanel, etc.):** envie os arquivos por FTP para `public_html/`.
- **Netlify / Vercel:** arraste a pasta no painel de deploy manual.
- **GitHub Pages:** suba os arquivos para um repositório e ative o Pages.

Depois é só acessar o endereço pelo navegador — tanto no computador do operador quanto
nos celulares dos jogadores (todos acessando o mesmo link).

## Como funciona

Ao abrir o app, a pessoa escolhe se é **jogador** (escolhe uma cartela) ou **operador**
(chama os números e administra).

### Primeiro acesso do operador — criar login

Da primeira vez que alguém clicar em **"Sou o operador"** nesse navegador/dispositivo,
o app vai pedir para **criar** um usuário e senha (é você quem define). Da próxima vez,
vai pedir para **entrar** com esse usuário e senha.

### ⚠️ Importante sobre o login e a sincronização entre aparelhos

Este é um site 100% estático (sem servidor/banco de dados por trás), então tudo —
cartelas, números sorteados, ganhadores **e o login do operador** — fica salvo no
`localStorage` do navegador, ou seja, **no aparelho/navegador que está sendo usado**,
não em um servidor central. Na prática isso significa:

- Se o **operador sempre usar o mesmo computador/celular e navegador**, tudo funciona
  perfeitamente: o login criado da primeira vez continua valendo, e o painel de
  chamador/administração guarda o progresso da partida normalmente.
- Se o app for aberto em **outro dispositivo ou navegador diferente**, ele vai
  aparecer "zerado" nesse aparelho (vai pedir para criar um login novo ali, e não vai
  ver os números já sorteados no aparelho do operador) — os dados **não sincronizam
  automaticamente entre aparelhos diferentes**.
- Isso também afeta os **jogadores**: se cada jogador abrir o link no **próprio
  celular**, cada celular terá sua própria cópia dos dados (não vai enxergar as
  cartelas que outros jogadores, em outros celulares, já escolheram).

**Recomendação para o dia do evento:** use um único dispositivo (ex.: o notebook ou
tablet do operador) como o "computador oficial" do bingo — é nele que o operador entra
como operador e chama os números, e é nele (ou em abas abertas nesse mesmo navegador)
que os jogadores escolhem as cartelas, por exemplo projetando a tela ou passando o
aparelho. Assim tudo fica sincronizado, pois é o mesmo navegador.

Se você precisar que **cada jogador escolha a cartela no próprio celular** e tudo
apareça em tempo real no painel do operador em outro aparelho, é necessário um
servidor/banco de dados central (por exemplo, Firebase, Supabase, ou uma API própria).
Esse app não inclui isso hoje porque foi pedido como arquivos estáticos para você
hospedar — mas posso te ajudar a evoluir para essa versão com sincronização real entre
aparelhos, caso você precise.

### Se esquecer a senha do operador

Como não há servidor, não existe recuperação de senha por e-mail. Para redefinir,
abra o navegador onde o login foi criado, entre no Console de desenvolvedor (F12) e
rode:

```js
localStorage.removeItem('bingo-admin-auth')
```

Na próxima vez que clicar em "Sou o operador", ele vai pedir para criar um login novo.
(Isso não apaga as cartelas nem os números sorteados — só o login.)

## Zerar tudo (cartelas, sorteio, ganhadores e login)

No console do navegador:

```js
localStorage.clear()
```

## Estrutura de arquivos

```
index.html
css/
  style.css
js/
  app.js
README.md
```
