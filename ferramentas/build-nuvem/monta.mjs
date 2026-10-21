// CORRE · o build na nuvem (sessão do Claude), enquanto o build.mjs de verdade não tá no repositório.
// Refaz o corre.min.js, o houzi.min.js e (desde a v4.0) o verso.min.js do mesmo jeito do build de verdade: cada arquivo dentro de um try/catch com o
// nome dele (um erro num módulo não derruba o app), tudo junto e minificado pelo esbuild 0.25.10 (es2020, utf8).
// Conferido em 13/10/2026: com o site/js da v3.40, sai byte a byte igual ao que tava no ar.
// O CSS NÃO é refeito daqui (o minificador de lá é outro e não bate byte a byte). Regra nova de CSS vai no FIM de um
// arquivo de origem (site/css/*.css), começando com o comentário "/* vX.YY · …"; este script minifica esse pedaço e põe
// no fim do corre.min.css depois de "/* +vX.YY */" (trocando, se já tiver). O build de verdade refaz tudo das origens.
// Uso: node ferramentas/build-nuvem/monta.mjs 3.41   (sem número: só confere se os .min batem com o site/js)
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const JS = join(RAIZ, 'site', 'js');
/* a ordem importa (core antes de quem usa o C.*, app por último); tirada dos marcadores do corre.min.js da v3.40 */
const CORRE = 'scene stickers core igcontas rolo-data rolo rolo-som banca grana estilo marcas vendas visitas estudio studio lote aprova manual stories feed insta mensagens grupos avisos push horus-presets horus horus-turbo horus-max horus-funil mural meucorre negocio refs bio estreia lojinha app'.split(' ');
const HOUZI = 'lab-motor lab-qr lab lab-som lab-filme lab-post lab-livro'.split(' ');
/* v4.0: o Correverso desce à parte, só quando alguém entra na cidade (C.versoCarrega no app.js). Roda depois do app.js,
   então tudo do C.* já existe quando ele chega. A ordem de dentro é a de antes. */
const VERSO = 'pad verso-som veiculos verso beats moveis casa'.split(' ');

function monta(lista, saida){
  const junto = lista.map(n => `try{\n${readFileSync(join(JS, n + '.js'), 'utf8')}\n}catch(e){try{console.error("[corre] ${n}.js",e)}catch(_){}}\n`).join('');
  const tmp = join(mkdtempSync(join(tmpdir(), 'corre-')), 'junto.js');
  writeFileSync(tmp, junto);
  const min = execFileSync('npx', ['--yes', 'esbuild@0.25.10', tmp, '--minify', '--charset=utf8', '--target=es2020', '--log-level=error'], { encoding: 'utf8', maxBuffer: 64 << 20 }).replace(/\n+$/, '');
  return `${min}\n//# sourceMappingURL=${saida}.map\n`;
}

const versao = process.argv[2];
let diferente = 0;
for(const [lista, nome] of [[CORRE, 'corre.min.js'], [HOUZI, 'houzi.min.js'], [VERSO, 'verso.min.js']]){
  const novo = monta(lista, nome), arq = join(JS, nome), velho = existsSync(arq) ? readFileSync(arq, 'utf8') : '';
  const igual = novo === velho;
  if(!igual) diferente++;
  if(versao){ if(!igual) writeFileSync(arq, novo); console.log(`${nome}: ${igual ? 'igual' : 'refeito'} (${novo.length} bytes)`); }
  else console.log(`${nome}: ${igual ? 'bate com o site/js' : 'DIFERENTE do site/js'}`);
}
if(versao){
  if(!/^\d+\.\d+$/.test(versao)) throw new Error('versão no formato 3.41');
  const idx = join(RAIZ, 'site', 'index.html');
  writeFileSync(idx, readFileSync(idx, 'utf8').replace(/\?v=\d+\.\d+/g, '?v=' + versao));
  console.log('index.html: ?v=' + versao);
  /* o CSS novo da versão (ver o comentário do topo) */
  /* todo trecho que começa com o comentário "/* vX.YY ·" (ou "/* vX.YY:"), até o próximo comentário de OUTRA versão ou
     o fim do arquivo; comentários seguidos da mesma versão ficam num trecho só (não duplica) */
  const CSS = join(RAIZ, 'site', 'css'), re = /\/\* v(\d+\.\d+)\s*[·:]/g, blocos = [];
  for(const n of readdirSync(CSS).filter(n => n.endsWith('.css') && !n.endsWith('.min.css')).sort()){
    const t = readFileSync(join(CSS, n), 'utf8'), mk = [...t.matchAll(re)];
    mk.forEach((x, i) => {
      if(x[1] !== versao || (i > 0 && mk[i - 1][1] === versao)) return;
      const prox = mk.slice(i + 1).find(y => y[1] !== versao);
      blocos.push(t.slice(x.index, prox ? prox.index : t.length));
    });
  }
  if(!blocos.length) console.log(`corre.min.css: nenhum trecho "/* v${versao} ·" nas origens (ok se a versão não mexeu em CSS)`);
  if(blocos.length){
    const tmp = join(mkdtempSync(join(tmpdir(), 'corre-')), 'novo.css');
    writeFileSync(tmp, blocos.join('\n'));
    const min = execFileSync('npx', ['--yes', 'esbuild@0.25.10', tmp, '--minify', '--charset=utf8', '--log-level=error'], { encoding: 'utf8' }).trim();
    const arq = join(CSS, 'corre.min.css'), tag = `/* +v${versao} */`;
    let css = readFileSync(arq, 'utf8');
    if(css.includes(tag)) css = css.slice(0, css.indexOf(tag));
    writeFileSync(arq, css.replace(/\n+$/, '') + '\n' + tag + min + '\n');
    console.log(`corre.min.css: + ${blocos.length} bloco(s) da v${versao} (${min.length} bytes)`);
  }
}
else if(diferente) process.exitCode = 1;
