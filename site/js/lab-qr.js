/* CORRE · STUDIO HOUZI · QR (v3.39).
   O QR do brandbook vivo (na contracapa do PDF, no kit e na página), feito aqui mesmo: modo byte (UTF-8), correção M,
   versões 1 a 10 (até ~200 letras), a máscara que der menos penalidade. Sem biblioteca de fora. */
(function(){
  'use strict';
  const C = window.Corre, M = C.labMotor;
  if(!M) return;

  /* nível M, versões 1-10: [código de correção por bloco, blocos do grupo 1, dados por bloco do grupo 1, blocos do grupo 2, dados do grupo 2] */
  const TAB = [null, [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0], [16, 4, 27, 0, 0],
    [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]];
  const ALINHA = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

  /* aritmética do Reed-Solomon (GF(256), polinômio 0x11D) */
  const mult = (x, y) => { let z = 0; for(let i = 7; i >= 0; i--){ z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 255; };
  const divisor = grau => { const r = new Array(grau).fill(0); r[grau - 1] = 1; let raiz = 1; for(let i = 0; i < grau; i++){ for(let j = 0; j < r.length; j++){ r[j] = mult(r[j], raiz); if(j + 1 < r.length) r[j] ^= r[j + 1]; } raiz = mult(raiz, 2); } return r; };
  const resto = (dados, div) => { const r = div.map(() => 0); for(const b of dados){ const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= mult(c, f); }); } return r; };

  function qr(texto){
    const bytes = [...new TextEncoder().encode(String(texto))];
    /* a menor versão que cabe */
    let v = 1;
    for(; v <= 10; v++){ const t = TAB[v], dadosCw = t[1] * t[2] + t[3] * t[4], conta = v < 10 ? 8 : 16; if(4 + conta + bytes.length * 8 <= dadosCw * 8) break; }
    if(v > 10) throw new Error('texto grande demais pro QR');
    const [ec, n1, d1, n2, d2] = TAB[v], cap = (n1 * d1 + n2 * d2) * 8;
    /* os bits: modo byte (0100), o tamanho, os dados, o fim e o enchimento */
    const bits = [];
    const poe = (val, n) => { for(let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    poe(4, 4); poe(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => poe(b, 8));
    poe(0, Math.min(4, cap - bits.length)); while(bits.length % 8) bits.push(0);
    const dados = []; for(let i = 0; i < bits.length; i += 8){ let b = 0; for(let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; dados.push(b); }
    for(let p = 0; dados.length < cap / 8; p ^= 1) dados.push(p ? 0x11 : 0xEC);
    /* os blocos, a correção de cada um e o entrelaçado */
    const div = divisor(ec), blocos = []; let k = 0;
    for(let i = 0; i < n1 + n2; i++){ const d = dados.slice(k, k + (i < n1 ? d1 : d2)); k += d.length; blocos.push({ d, e: resto(d, div) }); }
    const cw = [];
    for(let i = 0; i < Math.max(d1, d2); i++) blocos.forEach(b => { if(i < b.d.length) cw.push(b.d[i]); });
    for(let i = 0; i < ec; i++) blocos.forEach(b => cw.push(b.e[i]));
    /* a grade: padrões fixos */
    const n = v * 4 + 17, mod = new Uint8Array(n * n), fixo = new Uint8Array(n * n);
    const set = (x, y, escuro) => { mod[y * n + x] = escuro ? 1 : 0; fixo[y * n + x] = 1; };
    for(let i = 0; i < n; i++){ set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const localizador = (cx, cy) => { for(let dy = -4; dy <= 4; dy++) for(let dx = -4; dx <= 4; dx++){ const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if(x >= 0 && x < n && y >= 0 && y < n) set(x, y, d !== 2 && d !== 4); } };
    localizador(3, 3); localizador(n - 4, 3); localizador(3, n - 4);
    const al = ALINHA[v], na = al.length;
    for(let i = 0; i < na; i++) for(let j = 0; j < na; j++){
      if((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
      for(let dy = -2; dy <= 2; dy++) for(let dx = -2; dx <= 2; dx++) set(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    const formato = mascara => {
      const dado = (0 << 3) | mascara; let r = dado; for(let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((dado << 10) | r) ^ 0x5412, bit = i => ((b >>> i) & 1) === 1;
      for(let i = 0; i <= 5; i++) set(8, i, bit(i));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for(let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
      for(let i = 0; i < 8; i++) set(n - 1 - i, 8, bit(i));
      for(let i = 8; i < 15; i++) set(8, n - 15 + i, bit(i));
      set(8, n - 8, true);
    };
    formato(0);
    if(v >= 7){
      let r = v; for(let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      const b = (v << 12) | r;
      for(let i = 0; i < 18; i++){ const bit = ((b >>> i) & 1) === 1, a = n - 11 + i % 3, c = Math.floor(i / 3); set(a, c, bit); set(c, a, bit); }
    }
    /* os dados em zigue-zague, de baixo pra cima, de duas em duas colunas */
    let i = 0;
    for(let dir = n - 1; dir >= 1; dir -= 2){
      if(dir === 6) dir = 5;
      for(let vert = 0; vert < n; vert++) for(let j = 0; j < 2; j++){
        const x = dir - j, sobe = ((dir + 1) & 2) === 0, y = sobe ? n - 1 - vert : vert;
        if(!fixo[y * n + x] && i < cw.length * 8){ mod[y * n + x] = (cw[i >>> 3] >>> (7 - (i & 7))) & 1; i++; }
      }
    }
    /* as 8 máscaras: fica a que deixa o código mais fácil de ler (menos penalidade) */
    const inverte = (mk, x, y) => [(x + y) % 2 === 0, y % 2 === 0, x % 3 === 0, (x + y) % 3 === 0, (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x * y) % 2 + (x * y) % 3 === 0, ((x * y) % 2 + (x * y) % 3) % 2 === 0, ((x + y) % 2 + (x * y) % 3) % 2 === 0][mk];
    const aplica = mk => { for(let y = 0; y < n; y++) for(let x = 0; x < n; x++) if(!fixo[y * n + x] && inverte(mk, x, y)) mod[y * n + x] ^= 1; };
    const penal = () => {
      let p = 0, escuros = 0;
      const linha = get => { let run = 1, ant = get(0); for(let a = 1; a < n; a++){ const c = get(a); if(c === ant){ run++; if(run === 5) p += 3; else if(run > 5) p++; } else { run = 1; ant = c; } } };
      for(let y = 0; y < n; y++) linha(x => mod[y * n + x]);
      for(let x = 0; x < n; x++) linha(y => mod[y * n + x]);
      for(let y = 0; y < n - 1; y++) for(let x = 0; x < n - 1; x++){ const c = mod[y * n + x]; if(c === mod[y * n + x + 1] && c === mod[(y + 1) * n + x] && c === mod[(y + 1) * n + x + 1]) p += 3; }
      const P1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], P2 = P1.slice().reverse();
      const acha = get => { for(let a = 0; a + 11 <= n; a++){ let ok1 = true, ok2 = true; for(let b = 0; b < 11; b++){ const c = get(a + b); if(c !== P1[b]) ok1 = false; if(c !== P2[b]) ok2 = false; } if(ok1) p += 40; if(ok2) p += 40; } };
      for(let y = 0; y < n; y++) acha(x => mod[y * n + x]);
      for(let x = 0; x < n; x++) acha(y => mod[y * n + x]);
      for(let a = 0; a < n * n; a++) escuros += mod[a];
      const tot = n * n; p += (Math.floor((Math.abs(escuros * 20 - tot * 10) + tot - 1) / tot) - 1) * 10;
      return p;
    };
    let melhor = 0, menor = Infinity;
    for(let mk = 0; mk < 8; mk++){ aplica(mk); formato(mk); const pp = penal(); if(pp < menor){ menor = pp; melhor = mk; } aplica(mk); }
    aplica(melhor); formato(melhor);
    return { n, m: mod, versao: v, mascara: melhor };
  }
  M.qr = qr;
  /* o QR como cena: um retângulo por trecho escuro de cada linha (cabe num caminho só) */
  M.qrEls = (q, x, y, tam, cor) => {
    const u = tam / q.n, d = [];
    for(let r = 0; r < q.n; r++){ let c = 0; while(c < q.n){ if(!q.m[r * q.n + c]){ c++; continue; } const c0 = c; while(c < q.n && q.m[r * q.n + c]) c++; M.forma.ret(x + c0 * u, y + r * u, (c - c0) * u + 0.02, u + 0.02, 0).forEach(k => d.push(k)); } }
    return [{ d, f: cor }];
  };
  /* o QR em SVG, com a margem que o leitor precisa (4 módulos) */
  M.qrSvg = (texto, o) => { o = o || {}; const q = qr(texto), m = 4, w = q.n + 2 * m; return M.svg(M.qrEls(q, m, m, q.n, o.cor || '#111111'), { vb: { x: 0, y: 0, w, h: w }, fundo: o.fundo || '#FFFFFF', titulo: o.titulo || 'QR' }); };
})();
