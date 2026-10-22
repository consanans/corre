/* CORRE · HÓRUS 3.0 TURBO
   1. Caça automática: nicho + cidade/bairro e o Hórus procura sozinho no OpenStreetMap (grátis, sem chave).
   2. Mapa de verdade com a rota do dia: a ordem mais curta entre as paradas, o link pro Google Maps
      e a rota agendada como visitas (caem no sino e na agenda).
   3. IA de abordagem: a mensagem sob medida pra cada empresa e a leitura da resposta do cliente,
      com a réplica pronta, a etapa e quando retomar.
   4. Placar que vende: onde (nicho), com que mensagem e em que hora o corre rende, e quanto o mês promete. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  if(!C.horus || !C.horus._) return;
  const Z = C.horus._, H = Z.H;
  H.auto = H.auto || { n: '', b: '', st: '', busy: false };
  H.mapa = H.mapa || { f: 'abertos', sel: {}, rota: null, pc: null };
  const TT = {};

  /* ============================== 1. CAÇA AUTOMÁTICA ============================== */
  /* nicho → filtros do OpenStreetMap. Nicho sem filtro (ou criado pela pessoa) usa as "palavras que identificam" no nome. */
  const OSM = {
    comida: [['amenity', '~', '^(restaurant|fast_food|food_court|ice_cream|bar|pub|biergarten)$'], ['shop', '~', '^(bakery|confectionery|butcher|deli|pastry)$']],
    cafe: [['amenity', '=', 'cafe'], ['shop', '~', '^(coffee|tea)$']],
    estetica: [['shop', '~', '^(beauty|cosmetics|massage)$'], ['leisure', '=', 'spa']],
    academia: [['leisure', '~', '^(fitness_centre|sports_centre)$']],
    moda: [['shop', '~', '^(clothes|shoes|boutique|jewelry|bag|fashion_accessories|optician|watches)$']],
    beleza: [['shop', '~', '^(hairdresser|beauty|nail_salon|barber)$']],
    imovel: [['office', '=', 'estate_agent']],
    pet: [['shop', '~', '^(pet|pet_grooming)$'], ['amenity', '=', 'veterinary']],
    eventos: [['amenity', '~', '^(events_venue|conference_centre|nightclub)$'], ['shop', '=', 'party']],
    educacao: [['amenity', '~', '^(school|language_school|music_school|college|kindergarten|prep_school)$']],
    auto: [['shop', '~', '^(car|car_repair|car_parts|tyres|motorcycle)$'], ['amenity', '=', 'car_wash']],
    transp: [['office', '~', '^(logistics|moving_company|courier)$']],
    autoescola: [['amenity', '=', 'driving_school']],
    gas: [['shop', '=', 'gas']],
    obra: [['shop', '~', '^(hardware|doityourself|trade)$'], ['craft', '~', '^(builder|roofer|carpenter)$']],
    entrega: [['office', '=', 'courier']],
    mudanca: [['office', '=', 'moving_company']],
    servico: [['craft', '~', '^(plumber|electrician|hvac)$'], ['shop', '=', 'pest_control']],
    locadora: [['amenity', '=', 'car_rental'], ['shop', '=', 'car_rental']],
    fretamento: [['shop', '=', 'travel_agency'], ['office', '=', 'travel_agent']],
    agro: [['shop', '~', '^(agrarian|farm|garden_centre)$']],
    saude: [['amenity', '~', '^(dentist|doctors|clinic)$'], ['healthcare', '~', '^(dentist|doctor|clinic|physiotherapist|speech_therapist)$']],
    escritorio: [['office', '~', '^(lawyer|accountant|tax_advisor)$']],
    hotel: [['tourism', '~', '^(hotel|guest_house|hostel|chalet|apartment)$']]
  };
  const TIPO = { restaurant: 'restaurante', fast_food: 'lanchonete', cafe: 'café', bar: 'bar', pub: 'bar', ice_cream: 'sorveteria', bakery: 'padaria', confectionery: 'doceria', butcher: 'açougue',
    beauty: 'estética', cosmetics: 'cosméticos', massage: 'massagem', spa: 'spa', fitness_centre: 'academia', sports_centre: 'centro esportivo', clothes: 'roupas', shoes: 'calçados', jewelry: 'joalheria',
    optician: 'ótica', hairdresser: 'salão', nail_salon: 'manicure', barber: 'barbearia', estate_agent: 'imobiliária', pet: 'pet shop', pet_grooming: 'banho e tosa', veterinary: 'veterinário',
    events_venue: 'espaço de eventos', nightclub: 'balada', school: 'escola', language_school: 'escola de idiomas', music_school: 'escola de música', kindergarten: 'educação infantil', college: 'faculdade',
    car: 'concessionária', car_repair: 'oficina', car_parts: 'autopeças', tyres: 'pneus', motorcycle: 'motos', car_wash: 'lava-car', logistics: 'logística', moving_company: 'mudanças', courier: 'entregas',
    driving_school: 'autoescola', gas: 'gás', hardware: 'ferragens', doityourself: 'material de construção', trade: 'atacado', builder: 'construtora', plumber: 'encanador', electrician: 'eletricista',
    hvac: 'ar-condicionado', pest_control: 'dedetizadora', car_rental: 'locadora', travel_agency: 'turismo', agrarian: 'agropecuária', farm: 'agro', garden_centre: 'jardinagem', fuel: 'posto', dentist: 'odonto', doctors: 'consultório', clinic: 'clínica', doctor: 'consultório', physiotherapist: 'fisioterapia', speech_therapist: 'fono', lawyer: 'advocacia', accountant: 'contabilidade', tax_advisor: 'contabilidade', hotel: 'hotel', guest_house: 'pousada', hostel: 'hostel', chalet: 'chalé', apartment: 'hospedagem' };
  const POI = '[~"^(shop|office|amenity|craft|leisure|healthcare|tourism)$"~"."]';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const quoteRe = s => String(s).replace(/\\/g, '').replace(/"/g, '');
  /* "hamburgu|burger|lanchonete" → só palavras, sem sintaxe de regex que o mapa não entende */
  const palavras = re => String(re || '').split('|').map(w => w.replace(/[^\p{L}\p{N} -]/gu, '').trim()).filter(w => w.length >= 3).slice(0, 20).join('|');

  async function geo(q){
    H.geoc = H.geoc || {};
    const k = q.toLowerCase(); if(H.geoc[k]) return H.geoc[k];
    const u = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&accept-language=pt-BR&q=' + encodeURIComponent(q);
    const r = await fetch(u, { headers: { Accept: 'application/json' } });
    if(!r.ok) throw { code: 'mapa', status: r.status };
    const j = await r.json(), g = j && j[0]; if(!g) return null;
    const out = { lat: +g.lat, lng: +g.lon, bb: (g.boundingbox || []).map(Number), nome: g.display_name };
    H.geoc[k] = out; return out;
  }
  /* "Cidade, Estado, Brasil": com a UF não tem como confundir as 5.570 cidades (tem muita São José por aí) */
  const lugarQ = (cidade, uf) => [cidade, Z.UFN[uf] || '', 'Brasil'].filter(Boolean).join(', ');
  const praca = () => Z.cfg().praca;
  const cidadeQ = () => { const p = praca(); return lugarQ(p.cidade || Z.cfg().cidade, p.uf); };

  /* filtros de um nicho: os que a IA montou (n.osm) ou os do catálogo; só chaves e valores seguros */
  const OSM_KEYS = /^(shop|office|amenity|craft|leisure|healthcare|tourism|industrial|club|sport|man_made)$/;
  const osmDe = n => {
    const proprio = Array.isArray(n.osm) ? n.osm.filter(f => Array.isArray(f) && OSM_KEYS.test(f[0]) && (f[1] === '=' || f[1] === '~') && /^[\^]?[a-z0-9_|()$^]{1,120}$/.test(String(f[2]))) : [];
    return proprio.length ? proprio : (OSM[n.k] || []);
  };
  function consulta(n, area){
    const fs = [];
    osmDe(n).forEach(([k, op, v]) => fs.push(`nwr["${k}"${op}"${quoteRe(v)}"]${area};`));
    const pw = palavras(n.re); if(pw) fs.push(`nwr["name"~"${quoteRe(pw)}",i]${POI}${area};`);
    return fs;
  }
  async function overpass(q){
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 40000);
    try{
      const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal });
      if(r.status === 429 || r.status === 504) throw { code: 'ocupado' };
      if(!r.ok) throw { code: 'mapa', status: r.status };
      return (await r.json()).elements || [];
    } finally { clearTimeout(t); }
  }
  function linhaDe(e, nk, P){
    P = P || praca();
    const tg = e.tags || {}, nome = String(tg.name || tg.brand || '').trim(); if(!nome) return null;
    const tels = [tg['contact:whatsapp'], tg.mobile, tg['contact:mobile'], tg.phone, tg['contact:phone']].filter(Boolean).join(';').split(/[;,/]/).map(s => s.trim()).filter(Boolean);
    let ph = null; for(const t of tels){ const p = Z.phoneOf(t, P.ddd); if(p && p.wa){ ph = p; break; } if(p && !ph) ph = p; }
    const ig = String(tg['contact:instagram'] || tg.instagram || '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '');
    const tipo = tg.amenity || tg.shop || tg.office || tg.craft || tg.leisure || tg.healthcare || '';
    const lat = e.lat != null ? e.lat : e.center && e.center.lat, lng = e.lon != null ? e.lon : e.center && e.center.lon;
    const cat = TIPO[tipo] || String(tipo).replace(/_/g, ' ');
    /* FARO: o que o mapa conta sobre a empresa */
    const oh = String(tg.opening_hours || ''), sd = parseInt(String(tg.start_date || tg.opening_date || '').slice(0, 4), 10), sinais = [];
    if(!(tg.website || tg['contact:website'] || tg.url)) sinais.push('sem_site');
    if(!(tg['contact:instagram'] || tg.instagram)) sinais.push('sem_insta');
    if(ph && !ph.wa && ph.fixo) sinais.push('so_fixo');
    if(!oh) sinais.push('sem_horario');
    if(tg.brand || tg['brand:wikidata']) sinais.push('rede');
    if(sd && sd >= new Date().getFullYear() - 1) sinais.push('nova');
    if(/24\/7/.test(oh)) sinais.push('24h'); else if(/(2[2-3]|0[0-4]):\d\d/.test(oh)) sinais.push('aberto_tarde');
    return { nome, ph, insta: /^[A-Za-z0-9_.]{1,30}$/.test(ig) ? ig : '', site: String(tg['contact:website'] || tg.website || '').slice(0, 120),
      end: [tg['addr:street'], tg['addr:housenumber']].filter(Boolean).join(', '), bairro: tg['addr:suburb'] || tg['addr:neighbourhood'] || tg['addr:district'] || '',
      lat, lng, cat, sinais, fonte: 'mapa', nicho: nk || Z.guessNicho(`${nome} ${cat}`),
      /* a caixa da cidade pega a vizinha às vezes: vale o "addr:city" quando o mapa tem */
      cidade: String(tg['addr:city'] || P.cidade || '').slice(0, 60), uf: P.uf };
  }
  function marcaRepetidas(rows){
    const tels = new Set(), names = new Set(), seen = new Set();
    H.leads.forEach(l => { [l.wa, l.fixo].forEach(d => { if(d) tels.add(String(d).slice(-8)); }); names.add(Z.normName(Z.shortName(l.nome))); });
    return rows.map(r => {
      const k8 = r.ph ? String(r.ph.wa || r.ph.fixo).slice(-8) : '', nk = Z.normName(Z.shortName(r.nome)), kk = k8 || nk;
      const dup = (k8 && tels.has(k8)) || names.has(nk) ? 'já está no Hórus' : seen.has(kk) ? 'repetida na lista' : '';
      seen.add(kk); return Object.assign(r, { dup, on: !dup });
    });
  }
  async function cacar(){
    const A = H.auto, c = Z.cfg(); if(A.busy) return;
    const P = praca(), onde = Z.lugarTxt(P.cidade, P.uf);
    if(!P.cidade){ C.toast('Escolhe o estado e a cidade da caça.'); return; }
    const nichos = A.n ? c.nichos.filter(n => n.k === A.n) : c.nichos.filter(n => osmDe(n).length || palavras(n.re));
    if(!nichos.length){ C.toast('Esse nicho não tem filtro no mapa. Coloca "palavras que identificam" em Ajustar.'); return; }
    A.busy = true; A.st = `Achando ${A.b ? A.b + ' em ' : ''}${onde} no mapa…`; Z.paintCaca();
    try{
      const cid = await geo(cidadeQ()); if(!cid) throw { code: 'cidade' };
      let area = `(${cid.bb[0]},${cid.bb[2]},${cid.bb[1]},${cid.bb[3]})`;
      if(A.b){
        await sleep(1100);
        const b = await geo(`${A.b}, ${cidadeQ()}`);
        if(!b) throw { code: 'bairro' };
        const span = b.bb.length === 4 ? Math.abs(b.bb[1] - b.bb[0]) : 0;
        area = span > 0.006 ? `(${b.bb[0]},${b.bb[2]},${b.bb[1]},${b.bb[3]})` : `(around:2200,${b.lat},${b.lng})`;
      }
      A.st = `Procurando ${A.n ? (nichos[0].n || '').toLowerCase() : 'todos os nichos'}…`; Z.paintCaca();
      const parts = nichos.flatMap(n => consulta(n, area).map(f => ({ f, k: n.k })));
      const els = await overpass(`[out:json][timeout:30];(${parts.map(p => p.f).join('')});out center tags 400;`);
      const unico = nichos.length === 1 ? nichos[0].k : '';
      const rows = []; const vistos = new Set();
      els.forEach(e => { const k = e.type + e.id; if(vistos.has(k)) return; vistos.add(k); const r = linhaDe(e, unico, P); if(r) rows.push(r); });
      rows.sort((a, b) => (b.ph ? (b.ph.wa ? 2 : 1) : 0) - (a.ph ? (a.ph.wa ? 2 : 1) : 0) || a.nome.localeCompare(b.nome));
      H.rows = marcaRepetidas(rows.slice(0, 300)); H.assunto = A.n ? (nichos[0].n || '') : 'mapa';
      const fone = H.rows.filter(r => r.ph).length, dups = H.rows.filter(r => r.dup).length;
      A.st = H.rows.length ? `${H.rows.length} achadas no mapa · ${fone} com telefone${dups ? ` · ${dups} já estavam no radar` : ''}.` : 'O mapa não tem empresas desse nicho aí. Tenta outro bairro, outro nicho ou "Colar lista".';
    }catch(e){
      H.rows = null;
      A.st = e && e.code === 'ocupado' ? 'O mapa tá ocupado agora. Tenta de novo em um minuto.' : e && e.code === 'bairro' ? `Não achei o bairro "${A.b}" em ${onde}. Confere o nome ou deixa em branco pra cidade toda.` : e && e.code === 'cidade' ? `Não achei ${onde} no mapa. Confere a cidade em Ajustar.` : (e && e.name === 'AbortError') ? 'O mapa demorou demais. Tenta um bairro ou um nicho só.' : 'Não deu pra falar com o mapa agora. Confere a internet e tenta de novo.';
    }finally{ A.busy = false; Z.paintCaca(); }
  }
  /* v4.24: o Garimpo da Mesa. Um toque varre a praça inteira nos nichos quentes e mornos e põe no radar as empresas
     com telefone que ainda não tão lá (até 30: as de celular primeiro, depois as que têm Instagram). Quem chama relê o
     radar e mostra as novas na mesa */
  TT.garimpa = async function(){
    const c = Z.cfg(), P = praca();
    if(!P.cidade) throw { code: 'praca' };
    const temFiltro = n => osmDe(n).length || palavras(n.re);
    let ns = c.nichos.filter(n => n.prio !== 'cold' && temFiltro(n));
    if(!ns.length) ns = c.nichos.filter(temFiltro);
    if(!ns.length) throw { code: 'nicho' };
    const cid = await geo(cidadeQ()); if(!cid) throw { code: 'cidade' };
    const area = `(${cid.bb[0]},${cid.bb[2]},${cid.bb[1]},${cid.bb[3]})`;
    const els = await overpass(`[out:json][timeout:30];(${ns.flatMap(n => consulta(n, area)).join('')});out center tags 400;`);
    const vistos = new Set(), rows = [];
    els.forEach(e => { const k = e.type + e.id; if(vistos.has(k)) return; vistos.add(k); const r = linhaDe(e, '', P); if(r && r.ph) rows.push(r); });
    const novas = marcaRepetidas(rows).filter(r => !r.dup).sort((a, b) => (b.ph.wa ? 1 : 0) - (a.ph.wa ? 1 : 0) || (b.insta ? 1 : 0) - (a.insta ? 1 : 0)).slice(0, 30);
    if(novas.length){ const antes = H.assunto; H.assunto = 'garimpo'; try{ await Z.addRows(novas, 'caca'); }finally{ H.assunto = antes; } }
    return { lidas: rows.length, novas: novas.length, wa: novas.filter(r => r.ph.wa).length };
  };
  TT.cacaAuto = function(){
    const c = Z.cfg(), A = H.auto;
    return `<div class="hz-auto">
      <div class="hz-auto-f"><div class="fld"><label class="hz-lbl" for="hz-an">Nicho</label><select class="hz-in" id="hz-an"><option value="">Todos os nichos</option>${c.nichos.map(n => `<option value="${esc(n.k)}"${A.n === n.k ? ' selected' : ''}>${esc(n.n)}</option>`).join('')}</select></div>
        <div class="fld"><label class="hz-lbl" for="hz-ab">Bairro <small>opcional</small></label><input class="hz-in" id="hz-ab" value="${esc(A.b)}" placeholder="Centro, Jardins…" autocomplete="off"></div>
        <button type="button" class="hz-btn pri" data-act="hz-auto"${A.busy ? ' disabled' : ''}>${ico('pin')} ${A.busy ? 'Caçando…' : 'Caçar no mapa'}</button></div>
      <p class="hz-auto-st" aria-live="polite">${esc(A.st || '')}</p>
      <p class="hz-help">Procura no OpenStreetMap, o mapa aberto: grátis e sem chave. Nem toda empresa tem telefone lá. As que vierem sem telefone entram no mapa e na rota de visita. Pra completar com o Google, usa "Colar lista".</p>
    </div>`;
  };

  /* ============================== 1b. CAÇA AO VIVO (porta a porta) ============================== */
  H.vivo = H.vivo || { r: 500, n: '', st: '', busy: false, rows: null, pos: null, onde: null };
  const RUMO = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  const rumo = (a, b) => { const r = x => x * Math.PI / 180, y = Math.sin(r(b.lng - a.lng)) * Math.cos(r(b.lat)), x = Math.cos(r(a.lat)) * Math.sin(r(b.lat)) - Math.sin(r(a.lat)) * Math.cos(r(b.lat)) * Math.cos(r(b.lng - a.lng)); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; };
  /* a cidade de onde você tá (pra gravar no lead e achar o DDD) */
  async function ondeEstou(p){
    try{
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&accept-language=pt-BR&lat=${p.lat}&lon=${p.lng}`, { headers: { Accept: 'application/json' } });
      if(!r.ok) return null; const j = await r.json(), a = j.address || {};
      const cidade = a.city || a.town || a.municipality || a.village || '', uf = String(a['ISO3166-2-lvl4'] || '').replace(/^BR-/, '');
      const ddd = cidade && Z.UFN[uf] ? await Z.dddDe(cidade, uf).catch(() => '') : '';
      return { cidade, uf: Z.UFN[uf] ? uf : '', ddd };
    }catch(e){ return null; }
  }
  async function cacarVivo(){
    const V = H.vivo, c = Z.cfg(); if(V.busy) return;
    if(!navigator.geolocation){ V.st = 'Esse aparelho não passa a localização.'; Z.paintCaca(); return; }
    V.busy = true; V.st = 'Pegando onde você tá…'; Z.paintCaca();
    try{
      const p = await new Promise((ok, fail) => navigator.geolocation.getCurrentPosition(x => ok({ lat: x.coords.latitude, lng: x.coords.longitude }), fail, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }));
      V.pos = p;
      if(!V.onde || km(V.onde.p, p) > 3){ const o = await ondeEstou(p); V.onde = Object.assign({ p }, o || { cidade: '', uf: '', ddd: '' }); }
      V.st = `Olhando ${V.r < 1000 ? V.r + ' m' : '1 km'} em volta…`; Z.paintCaca();
      const area = `(around:${V.r},${p.lat},${p.lng})`;
      let parts;
      if(V.n === '*'){ parts = [`nwr["name"]["shop"]${area};`, `nwr["name"]["office"]${area};`, `nwr["name"]["craft"]${area};`, `nwr["name"]["healthcare"]${area};`, `nwr["name"]["amenity"~"^(restaurant|fast_food|cafe|bar|pub|clinic|dentist|doctors|pharmacy|school|language_school|driving_school|veterinary|car_wash|fuel|bank)$"]${area};`, `nwr["name"]["leisure"~"^(fitness_centre|sports_centre)$"]${area};`]; }
      else { const ns = V.n ? c.nichos.filter(n => n.k === V.n) : c.nichos.filter(n => osmDe(n).length || palavras(n.re)); parts = ns.flatMap(n => consulta(n, area)); }
      if(!parts.length){ V.rows = []; V.st = 'Esses nichos não têm filtro no mapa. Escolhe "Qualquer comércio".'; return; }
      const els = await overpass(`[out:json][timeout:25];(${parts.join('')});out center tags 200;`);
      const P = { cidade: (V.onde && V.onde.cidade) || Z.cfg().praca.cidade, uf: (V.onde && V.onde.uf) || Z.cfg().praca.uf, ddd: (V.onde && V.onde.ddd) || '' };
      const vistos = new Set(), rows = [];
      els.forEach(e => { const k = e.type + e.id; if(vistos.has(k)) return; vistos.add(k); const r = linhaDe(e, V.n && V.n !== '*' ? V.n : '', P); if(r && r.lat != null){ r.dist = km(p, r) * 1000; r.rumo = rumo(p, r); rows.push(r); } });
      rows.sort((a, b) => a.dist - b.dist);
      V.rows = marcaRepetidas(rows.slice(0, 60));
      V.st = rows.length ? `${rows.length} ${rows.length === 1 ? 'empresa' : 'empresas'} a até ${V.r < 1000 ? V.r + ' m' : '1 km'} de você${V.onde && V.onde.cidade ? ' · ' + Z.lugarTxt(V.onde.cidade, V.onde.uf) : ''}.` : 'Nada desse nicho aqui perto no mapa. Aumenta o raio ou escolhe "Qualquer comércio".';
    }catch(e){
      V.rows = null;
      V.st = e && e.code === 1 ? 'Sem permissão de localização. Libera no navegador e tenta de novo.' : e && e.code === 'ocupado' ? 'O mapa tá ocupado agora. Tenta de novo em um minuto.' : 'Não deu pra olhar em volta agora. Confere a internet e a localização.';
    }finally{ V.busy = false; Z.paintCaca(); }
  }
  const metros = d => d < 1000 ? `${Math.round(d / 10) * 10} m` : `${(d / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
  TT.cacaVivo = function(){
    const c = Z.cfg(), V = H.vivo, S = Z.SINAIS;
    const rows = V.rows || [];
    return `<div class="hz-auto hz-vivo">
      <div class="hz-auto-f"><div class="fld"><label class="hz-lbl" for="hz-vn">O que procurar</label><select class="hz-in" id="hz-vn"><option value="">Os meus nichos</option><option value="*"${V.n === '*' ? ' selected' : ''}>Qualquer comércio</option>${c.nichos.map(n => `<option value="${esc(n.k)}"${V.n === n.k ? ' selected' : ''}>${esc(n.n)}</option>`).join('')}</select></div>
        <div class="fld"><span class="hz-lbl">Raio</span><div class="hz-chips" role="group" aria-label="Raio">${[[300, '300 m'], [500, '500 m'], [1000, '1 km']].map(([v, t]) => `<button type="button" class="hz-chip" data-act="hz-vivo-r" data-k="${v}" aria-pressed="${V.r === v}">${t}</button>`).join('')}</div></div>
        <button type="button" class="hz-btn pri" data-act="hz-vivo"${V.busy ? ' disabled' : ''}>${ico('pin')} ${V.busy ? 'Olhando…' : V.rows ? 'Atualizar (andei)' : 'Onde eu tô'}</button></div>
      <p class="hz-auto-st" aria-live="polite">${esc(V.st || '')}</p>
      ${rows.length ? `<ol class="hz-porta">${rows.map((r, i) => `<li class="${r.dup ? 'dup' : ''}">
          <span class="hz-dist"><b>${metros(r.dist)}</b><i aria-hidden="true" style="transform:rotate(${Math.round(r.rumo)}deg)">↑</i><small>${RUMO[Math.round(r.rumo / 45) % 8]}</small></span>
          <div class="hz-porta-tx"><b>${esc(r.nome)}</b><small>${esc([r.cat, r.end].filter(Boolean).join(' · '))}${r.ph ? ' · ' + esc(r.ph.fmt) : ''}</small>
            <span class="hz-sinais">${(r.sinais || []).filter(k => S[k]).map(k => `<span class="hz-sinal${c.faro.includes(k) ? ' on' : ''}">${esc(S[k].n)}</span>`).join('')}${r.dup ? '<span class="hz-sinal ja">já no radar</span>' : ''}</span></div>
          <div class="hz-acts"><button type="button" class="hz-btn pri sm" data-act="hz-vivo-entrei" data-i="${i}">Entrei aqui</button>${r.dup ? '' : `<button type="button" class="hz-btn sm" data-act="hz-vivo-add" data-i="${i}">Pôr no radar</button>`}</div>
        </li>`).join('')}</ol>
        ${rows.filter(r => !r.dup).length > 1 ? `<div class="hz-row-acts"><button type="button" class="hz-btn" data-act="hz-vivo-todos">Pôr as ${rows.filter(r => !r.dup).length} no radar</button></div>` : ''}` : ''}
      <p class="hz-help">Porta a porta: a lista segue a distância de onde você tá agora, com a direção (N, NE…). "Entrei aqui" põe no radar e marca a visita; o Hórus te lembra de voltar em 2 dias.</p>
    </div>`;
  };
  /* acha o lead de uma linha (pelo telefone ou nome) */
  const leadDaLinha = r => { const k8 = r.ph ? String(r.ph.wa || r.ph.fixo).slice(-8) : '', nk = Z.normName(Z.shortName(r.nome)); return H.leads.find(l => (k8 && [l.wa, l.fixo].some(d => d && String(d).slice(-8) === k8)) || Z.normName(Z.shortName(l.nome)) === nk); };
  async function vivoAdd(rows){ const n = await Z.addRows(rows, 'vivo'); await Z.load(); rows.forEach(r => { r.dup = 'já está no Hórus'; }); return n; }

  /* ============================== 2. MAPA E ROTA ============================== */
  let LP = null;
  function leaflet(){
    if(window.L && window.L.map) return Promise.resolve(window.L);
    if(LP) return LP;
    LP = new Promise((ok, fail) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css'; document.head.appendChild(css);
      const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
      s.onload = () => ok(window.L); s.onerror = () => { LP = null; fail(new Error('leaflet')); }; document.head.appendChild(s);
    });
    return LP;
  }
  /* fundo do mapa: OpenFreeMap (vetor, grátis, sem chave e sem limite) desenhado pelo MapLibre dentro do Leaflet.
     Sem WebGL ou se não carregar em 8 s, cai pro OpenStreetMap padrão. (O CARTO passou a pedir chave.) */
  let GP = null;
  const pegaJs = src => new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
  const pegaCss = href => { if(document.querySelector(`link[href="${href}"]`)) return; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); };
  const temWebGL = () => { try{ const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }catch(e){ return false; } };
  function maplibre(){
    if(window.L && window.L.maplibreGL) return Promise.resolve();
    if(GP) return GP;
    GP = (async () => {
      if(!temWebGL()) throw new Error('webgl');
      pegaCss('https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.css');
      if(!window.maplibregl) await pegaJs('https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.js');
      await pegaJs('https://cdn.jsdelivr.net/npm/@maplibre/maplibre-gl-leaflet@0.1.3/leaflet-maplibre-gl.min.js');
      if(!window.L.maplibreGL) throw new Error('ponte');
    })().catch(e => { GP = null; throw e; });
    return GP;
  }
  const OSM_ATR = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
  function fundoOSM(L, map){ if(M.fundo === 'osm') return; M.fundo = 'osm'; L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: OSM_ATR }).addTo(map); }
  async function fundo(L, map){
    try{
      await maplibre();
      if(M.map !== map) return;
      const gl = L.maplibreGL({ style: 'https://tiles.openfreemap.org/styles/positron', attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> ' + OSM_ATR });
      gl.addTo(map); M.fundo = 'gl'; M.gl = gl;
      setTimeout(() => { try{ const mm = gl.getMaplibreMap && gl.getMaplibreMap(); if(M.map === map && M.fundo === 'gl' && mm && !mm.isStyleLoaded()){ map.removeLayer(gl); M.fundo = ''; fundoOSM(L, map); } }catch(e){} }, 8000);
    }catch(e){ if(M.map === map) fundoOSM(L, map); }
  }
  const COR = { hot: '#FF5A3C', warm: '#FFB020', cold: '#5AA9FF', done: '#8A8590' };
  const km = (a, b) => { const R = 6371, r = x => x * Math.PI / 180, dLa = r(b.lat - a.lat), dLo = r(b.lng - a.lng), h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  const kmTxt = d => d < 1 ? `${Math.round(d * 1000)} m` : `${d.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
  const temGeo = l => l.lat != null && l.lng != null && isFinite(l.lat) && isFinite(l.lng);
  /* cidade do mapa: com o radar em várias cidades, o mapa e a rota olham uma de cada vez (ou todas, só pra ver) */
  function pcMapa(){
    if(!Z.variasPracas()) return '';
    if(H.mapa.pc != null) return H.mapa.pc;
    const p = praca(), k = Z.lugarTxt(p.cidade, p.uf), tem = Z.pracasNoRadar().some(x => x.k === k);
    return tem ? k : (Z.pracasNoRadar()[0] || {}).k || '';
  }
  function doMapa(){
    const pc = pcMapa(), f = H.mapa.f, alvos = new Set(Z.scored().filter(o => Z.digits(o.l) && Z.nextMsg(o.l)).slice(0, 12).map(o => o.l.id));
    return H.leads.filter(temGeo).filter(l => Z.naPraca(l, pc)).filter(l => f === 'todos' ? true : f === 'abertos' ? !Z.DONE.includes(l.st) : f === 'hot' ? !Z.DONE.includes(l.st) && Z.tempOf(Z.heat(l)) === 'hot' : f === 'alvos' ? alvos.has(l.id) : f === 'novo' ? l.st === 'novo' : true);
  }
  const M = { map: null, el: null, pins: null, rota: null, fundo: '', gl: null };
  async function pintaMapa(){
    const box = C.$('hz-map'); if(!box) return;
    let L; try{ L = await leaflet(); }catch(e){ const off = C.$('hz-map-off'); if(off){ off.hidden = false; off.textContent = 'O mapa não carregou. Confere a internet e abre o Hórus de novo.'; } return; }
    if(!C.$('hz-map')) return;
    if(M.el !== box || !M.map){
      if(M.map) try{ M.map.remove(); }catch(e){}
      M.el = box; M.map = L.map(box, { zoomControl: true, scrollWheelZoom: false, attributionControl: true });
      M.fundo = ''; fundo(L, M.map);
      M.pins = L.layerGroup().addTo(M.map); M.rota = L.layerGroup().addTo(M.map); M.fit = true;
    }
    M.pins.clearLayers();
    const ls = doMapa(), pts = [];
    ls.forEach(l => {
      const h = Z.heat(l), cor = Z.DONE.includes(l.st) ? COR.done : COR[Z.tempOf(h)] || COR.cold, sel = !!H.mapa.sel[l.id];
      const m = L.circleMarker([l.lat, l.lng], { radius: sel ? 9 : 7, color: sel ? '#141216' : '#fff', weight: sel ? 3 : 2, fillColor: cor, fillOpacity: .95 });
      m.bindPopup(`<div class="hz-pop"><b>${esc(Z.shortName(l.nome))}</b><span>${esc(Z.nichoOf(l).n)}${l.bairro ? ' · ' + esc(l.bairro) : ''}</span><span>${esc(Z.SN[l.st] || l.st)}${h ? ` · calor ${h}` : ''}</span>
        <div class="hz-pop-a"><button type="button" class="hz-btn sm" data-act="hz-open" data-id="${l.id}">Abrir</button><button type="button" class="hz-btn sm" data-act="hz-rsel" data-id="${l.id}">${sel ? 'Tirar da rota' : 'Pôr na rota'}</button></div></div>`);
      m.addTo(M.pins); pts.push([l.lat, l.lng]);
    });
    if(M.fit){
      if(pts.length) M.map.fitBounds(pts, { padding: [24, 24], maxZoom: 15 });
      else { try{ const g = await geo(cidadeQ()); if(g) M.map.setView([g.lat, g.lng], 12); }catch(e){ M.map.setView([-23.31, -51.16], 12); } }
      M.fit = false;
    }
    desenhaRota();
    setTimeout(() => { try{ M.map.invalidateSize(); }catch(e){} }, 60);
  }
  function desenhaRota(){
    const R = H.mapa.rota, L = window.L; if(!M.rota || !L) return;
    M.rota.clearLayers(); if(!R) return;
    const linha = [[R.ini.lat, R.ini.lng]].concat(R.paradas.map(l => [l.lat, l.lng]));
    L.polyline(linha, { color: '#141216', weight: 4, opacity: .85, dashArray: '8 6' }).addTo(M.rota);
    L.marker([R.ini.lat, R.ini.lng], { icon: L.divIcon({ className: 'hz-stop-ic ini', html: '<b>S</b>', iconSize: [26, 26] }), keyboard: false }).bindTooltip('Saída').addTo(M.rota);
    R.paradas.forEach((l, i) => L.marker([l.lat, l.lng], { icon: L.divIcon({ className: 'hz-stop-ic', html: `<b>${i + 1}</b>`, iconSize: [26, 26] }), keyboard: false }).bindTooltip(`${i + 1}. ${esc(Z.shortName(l.nome))}`).addTo(M.rota));
  }
  /* rota: vizinho mais perto a partir da saída e depois 2-opt pra desfazer os cruzamentos */
  function ordena(ini, ps){
    const rest = ps.slice(), out = []; let cur = ini;
    while(rest.length){ let bi = 0, bd = Infinity; rest.forEach((p, i) => { const d = km(cur, p); if(d < bd){ bd = d; bi = i; } }); cur = rest.splice(bi, 1)[0]; out.push(cur); }
    const tot = r => r.reduce((s, p, i) => s + km(i ? r[i - 1] : ini, p), 0);
    let melhor = out, best = tot(out), mudou = true, voltas = 0;
    while(mudou && voltas++ < 40){
      mudou = false;
      for(let i = 0; i < melhor.length - 1; i++) for(let j = i + 1; j < melhor.length; j++){
        const t = melhor.slice(0, i).concat(melhor.slice(i, j + 1).reverse(), melhor.slice(j + 1)), d = tot(t);
        if(d + 1e-9 < best){ melhor = t; best = d; mudou = true; }
      }
    }
    return { paradas: melhor, km: best };
  }
  async function saida(){
    const v = (C.$('hz-rs') || {}).value || 'gps', c = Z.cfg();
    if(v === 'base' && c.base && c.base.lat != null) return { lat: c.base.lat, lng: c.base.lng, nome: c.base.txt };
    if(v === 'gps' && navigator.geolocation){
      try{ const p = await new Promise((ok, fail) => navigator.geolocation.getCurrentPosition(ok, fail, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 })); return { lat: p.coords.latitude, lng: p.coords.longitude, nome: 'Onde você está' }; }
      catch(e){ C.toast('Sem a tua localização: a rota sai do centro da cidade. Dá pra salvar um endereço base.', 4200); }
    }
    if(c.base && c.base.lat != null) return { lat: c.base.lat, lng: c.base.lng, nome: c.base.txt };
    const pc = pcMapa(), alvo = pc ? Z.pracasNoRadar().find(x => x.k === pc) : null, cid = alvo ? alvo.cidade : (praca().cidade || c.cidade), uf = alvo ? alvo.uf : praca().uf;
    const g = await geo(lugarQ(cid, uf)); return g ? { lat: g.lat, lng: g.lng, nome: `Centro de ${cid}` } : null;
  }
  async function montarRota(){
    const n = Math.max(2, Math.min(12, +((C.$('hz-rn') || {}).value || 8))), q = (C.$('hz-rq') || {}).value || 'perto';
    const ini = await saida(); if(!ini){ C.toast('Não achei de onde sair. Salva um endereço base.'); return; }
    const pc = pcMapa() || (Z.variasPracas() ? Z.lugarTxt(praca().cidade, praca().uf) : '');
    let cand = H.leads.filter(l => temGeo(l) && !Z.DONE.includes(l.st) && Z.naPraca(l, pc));
    if(q === 'sel') cand = cand.filter(l => H.mapa.sel[l.id]);
    else if(q === 'bairro'){ const b = (C.$('hz-rbairro') || {}).value || ''; cand = cand.filter(l => (l.bairro || '') === b); }
    if(!cand.length){ C.toast(q === 'sel' ? 'Marca empresas no mapa com "Pôr na rota".' : `Nenhuma empresa com lugar no mapa${pc ? ' em ' + pc : ''} pra essa rota.`); return; }
    /* "quentes perto": quem vale mais e tá mais perto (calor pesa, distância desconta) */
    const esc0 = l => km(ini, l) / (1 + Z.heat(l) / 40) - (Z.isDue(l) ? 2 : 0);
    const escolha = q === 'sel' ? cand.slice(0, 12) : cand.map(l => ({ l, s: esc0(l) })).sort((a, b) => a.s - b.s).slice(0, n).map(o => o.l);
    const r = ordena(ini, escolha);
    H.mapa.rota = { ini, paradas: r.paradas, km: r.km, data: Z.today() };
    pintaRota(); desenhaRota();
    try{ if(M.map) M.map.fitBounds([[ini.lat, ini.lng]].concat(r.paradas.map(l => [l.lat, l.lng])), { padding: [30, 30], maxZoom: 15 }); }catch(e){}
  }
  function gmaps(ini, ps){
    const ll = p => `${(+p.lat).toFixed(6)},${(+p.lng).toFixed(6)}`, last = ps[ps.length - 1];
    return `https://www.google.com/maps/dir/?api=1&origin=${ll(ini)}&destination=${ll(last)}${ps.length > 1 ? '&waypoints=' + encodeURIComponent(ps.slice(0, -1).map(ll).join('|')) : ''}&travelmode=driving`;
  }
  /* hoje e já passou das 9h: começa na próxima meia hora */
  function inicioRota(){
    const hm = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }).format(new Date()).split(':').map(Number);
    const t = hm[0] * 60 + hm[1]; if(t < 8 * 60 + 30) return '09:00';
    const n = Math.min(21 * 60, Math.ceil((t + 15) / 30) * 30); return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  }
  function pintaRota(){
    const box = C.$('hz-rota-out'), R = H.mapa.rota; if(!box) return;
    if(!R){ box.innerHTML = ''; return; }
    const trechos = [], P = R.paradas; for(let i = 0; i < P.length; i += 9) trechos.push(P.slice(i, i + 9));
    let acc = 0;
    const min = Math.round(R.km * 1.35 / 25 * 60 + P.length * 15);
    box.innerHTML = `<ol class="hz-stops">${P.map((l, i) => { acc += km(i ? P[i - 1] : R.ini, l); const vs = C.visitas ? C.visitas.doLead(l.id) : []; return `<li><span class="n">${i + 1}</span><button type="button" class="hz-name" data-act="hz-open" data-id="${l.id}"><b>${esc(Z.shortName(l.nome))}</b><span>${esc(l.bairro || Z.nichoOf(l).n)} · ${kmTxt(acc)}${vs.length ? ` · visita ${esc(C.visitas.quando(vs[0]))}` : ''}</span></button><button type="button" class="hz-btn sm" data-act="hz-vis" data-id="${l.id}">${ico('pin')} Visita</button></li>`; }).join('')}</ol>
      <p class="hz-muted">${P.length} paradas · uns ${kmTxt(R.km * 1.35)} rodando · perto de ${Math.floor(min / 60) ? Math.floor(min / 60) + ' h ' : ''}${min % 60} min com 15 min em cada (estimativa).</p>
      <div class="hz-row-acts">${trechos.map((t, k) => `<a class="hz-btn${k ? '' : ' pri'}" href="${esc(gmaps(k ? trechos[k - 1][trechos[k - 1].length - 1] : R.ini, t))}" target="_blank" rel="noopener">${ico('ext')} ${trechos.length > 1 ? `Google Maps · parte ${k + 1}` : 'Abrir no Google Maps'}</a>`).join('')}<button type="button" class="hz-btn" data-act="hz-ragenda">${ico('cal')} Agendar a rota</button></div>
      <div class="hz-ragenda" id="hz-ragenda" hidden>
        <div class="row3"><div class="fld"><label class="hz-lbl" for="hz-rd">Dia</label><input class="hz-in" id="hz-rd" type="date" value="${esc(R.data)}"></div><div class="fld"><label class="hz-lbl" for="hz-rh">Começa às</label><input class="hz-in" id="hz-rh" type="time" value="${inicioRota()}"></div><div class="fld"><label class="hz-lbl" for="hz-ri">Cada parada</label><select class="hz-in" id="hz-ri"><option value="30">30 min</option><option value="45" selected>45 min</option><option value="60">1 h</option><option value="90">1 h 30</option></select></div></div>
        <button type="button" class="hz-btn pri" data-act="hz-ragendar">Agendar ${P.length} visitas</button><p class="hz-help">Cada parada vira uma visita no sino e na agenda, com o endereço e o WhatsApp da empresa. Dá pra mandar a confirmação de cada uma depois.</p></div>`;
  }
  async function agendarRota(btn){
    const R = H.mapa.rota; if(!R || !C.visitas) return;
    const dia = C.$('hz-rd').value, h0 = C.$('hz-rh').value || '09:00', passo = +C.$('hz-ri').value || 45;
    if(!dia){ C.toast('Escolhe o dia da rota.'); return; }
    const [hh, mm] = h0.split(':').map(Number), oferta = Z.cfg().oferta;
    const rows = R.paradas.map((l, i) => { const t = hh * 60 + mm + i * passo, H2 = Math.min(23, Math.floor(t / 60)), M2 = t >= 24 * 60 ? 59 : t % 60;
      return { lead_id: l.id, data: dia, hora: `${String(H2).padStart(2, '0')}:${String(M2).padStart(2, '0')}`, duracao: Math.max(15, Math.min(720, passo - 15 || 30)), pauta: 'Visita de prospecção', local: [l.endereco, l.bairro].filter(Boolean).join(', ').slice(0, 200), whats: String(l.wa || l.fixo || '').replace(/\D/g, '').slice(0, 15), obs: oferta ? `Apresentar: ${oferta}`.slice(0, 500) : '' }; });
    btn.disabled = true;
    try{
      await C.visitas.criarVarias(rows);
      for(const [i, l] of R.paradas.entries()){ Z.logH(l, 'visita', `Visita marcada: ${C.visitas.dia(dia)} às ${rows[i].hora}`); if(!l.prox || l.prox > dia) l.prox = dia; await Z.save(l, ['hist', 'prox']); }
      C.toast(`${rows.length} visitas na agenda de ${C.visitas.dia(dia)}. Tá tudo nos Avisos.`, 4200);
      Z.paint();
    }catch(e){ C.toast(C.errMsg(e, 'Não deu pra agendar a rota.')); btn.disabled = false; }
  }
  /* empresas com endereço mas sem lugar no mapa: o Hórus acha (1 por segundo, regra do mapa aberto) */
  async function localizar(btn){
    const c = Z.cfg(), fila = H.leads.filter(l => !temGeo(l) && (l.endereco || l.bairro) && !Z.DONE.includes(l.st)).slice(0, 25);
    if(!fila.length) return; btn.disabled = true; let ok = 0;
    for(const [i, l] of fila.entries()){
      btn.textContent = `Achando ${i + 1} de ${fila.length}…`;
      try{
        const g = await geo([l.endereco, l.bairro, l.cidade ? lugarQ(l.cidade, l.uf) : cidadeQ()].filter(Boolean).join(', '));
        if(g){ l.lat = g.lat; l.lng = g.lng; if(await Z.save(l, ['lat', 'lng'])) ok++; }
      }catch(e){}
      await sleep(1100);
    }
    C.toast(`${ok} de ${fila.length} entraram no mapa.`); M.fit = true; Z.paint();
  }
  function pintaMapaCard(){
    const el = C.$('hz-mapa'); if(!el) return;
    const comGeo = H.leads.filter(temGeo).length, semGeo = H.leads.filter(l => !temGeo(l) && (l.endereco || l.bairro) && !Z.DONE.includes(l.st)).length;
    const c = Z.cfg(), nsel = Object.keys(H.mapa.sel).filter(id => H.mapa.sel[id] && Z.H.by[id]).length;
    const bairros = [...new Set(H.leads.filter(l => temGeo(l) && l.bairro && !Z.DONE.includes(l.st)).map(l => l.bairro))].sort((a, b) => a.localeCompare(b));
    if(!el.querySelector('#hz-map')){
      el.innerHTML = `<div class="hz-h"><h2>Mapa e rota</h2><span id="hz-map-n"></span></div>
        <div class="hz-chips" role="group" aria-label="Quem aparece no mapa" id="hz-map-f"></div>
        <div class="hz-mapgrid"><div class="hz-mapbox"><div id="hz-map" aria-label="Mapa das empresas do radar"></div><p class="hz-map-off" id="hz-map-off" hidden></p></div>
          <div class="hz-rota"><h3 class="hz-sub">Rota do dia</h3>
            <div class="fld"><label class="hz-lbl" for="hz-rs">Saída</label><select class="hz-in" id="hz-rs"></select></div>
            <div class="fld" id="hz-rb-f" hidden><label class="hz-lbl" for="hz-rb">Endereço base</label><div class="hz-q2"><input class="hz-in" id="hz-rb" placeholder="Rua, número, bairro" autocomplete="street-address"><button type="button" class="hz-btn" data-act="hz-rbase">Salvar</button></div></div>
            <div class="row2"><div class="fld"><label class="hz-lbl" for="hz-rq">Quem entra</label><select class="hz-in" id="hz-rq"></select></div><div class="fld"><label class="hz-lbl" for="hz-rn">Paradas</label><select class="hz-in" id="hz-rn">${[4, 5, 6, 8, 10, 12].map(k => `<option value="${k}"${k === 8 ? ' selected' : ''}>${k}</option>`).join('')}</select></div></div>
            <div class="fld" id="hz-rbairro-f" hidden><label class="hz-lbl" for="hz-rbairro">Bairro</label><select class="hz-in" id="hz-rbairro"></select></div>
            <button type="button" class="hz-btn pri wide" data-act="hz-rota">${ico('pin')} Montar rota</button>
            <div id="hz-rota-out"></div></div></div>
        <div class="hz-row-acts" id="hz-geo-row"></div>`;
      M.fit = true;
    }
    C.$('hz-map-n').textContent = `${comGeo} de ${H.leads.length} no mapa`;
    const pcs = Z.pracasNoRadar(), pcAt = pcMapa();
    let pcEl = C.$('hz-map-pc');
    if(!pcEl){ pcEl = document.createElement('div'); pcEl.id = 'hz-map-pc'; pcEl.className = 'hz-chips'; pcEl.setAttribute('role', 'group'); pcEl.setAttribute('aria-label', 'Cidade no mapa'); C.$('hz-map-f').before(pcEl); }
    pcEl.hidden = pcs.length < 2;
    pcEl.innerHTML = pcs.length < 2 ? '' : pcs.slice(0, 10).map(p => `<button type="button" class="hz-chip" data-act="hz-mpc" data-k="${esc(p.k)}" aria-pressed="${pcAt === p.k}">${esc(p.k)} <b>${p.n}</b></button>`).join('') + `<button type="button" class="hz-chip" data-act="hz-mpc" data-k="" aria-pressed="${pcAt === ''}">Todas</button>`;
    C.$('hz-map-f').innerHTML = [['abertos', 'Em aberto'], ['hot', 'Quentes'], ['alvos', 'Alvos do dia'], ['novo', 'Novos'], ['todos', 'Todos']].map(([k, n]) => `<button type="button" class="hz-chip" data-act="hz-mf" data-k="${k}" aria-pressed="${H.mapa.f === k}">${n}</button>`).join('');
    const rs = C.$('hz-rs'), vrs = rs.value || (c.base ? 'base' : 'gps');
    rs.innerHTML = `<option value="gps">Onde eu estiver agora</option><option value="base">${c.base ? 'Base: ' + esc(String(c.base.txt).slice(0, 40)) : 'Um endereço base…'}</option>`; rs.value = vrs;
    C.$('hz-rb-f').hidden = !(rs.value === 'base' && !c.base) && !H.mapa.editBase;
    const rq = C.$('hz-rq'), vrq = rq.value || 'perto';
    rq.innerHTML = `<option value="perto">Os mais quentes perto</option><option value="bairro">Um bairro</option><option value="sel">Os que eu marquei (${nsel})</option>`; rq.value = vrq;
    C.$('hz-rbairro-f').hidden = rq.value !== 'bairro';
    const rb = C.$('hz-rbairro'), vrb = rb.value; rb.innerHTML = bairros.map(b => `<option${b === vrb ? ' selected' : ''}>${esc(b)}</option>`).join('') || '<option value="">Nenhum bairro no mapa</option>';
    C.$('hz-geo-row').innerHTML = semGeo ? `<button type="button" class="hz-btn" data-act="hz-geo">${ico('pin')} Achar ${Math.min(25, semGeo)} ${semGeo === 1 ? 'empresa' : 'empresas'} no mapa pelo endereço</button><span class="hz-muted">${semGeo} com endereço e sem lugar no mapa</span>` : '';
    pintaRota(); pintaMapa();
  }
  document.addEventListener('change', e => {
    if(e.target.id === 'hz-rq'){ C.$('hz-rbairro-f').hidden = e.target.value !== 'bairro'; }
    if(e.target.id === 'hz-rs'){ const c = Z.cfg(); H.mapa.editBase = e.target.value === 'base' && !c.base; C.$('hz-rb-f').hidden = !H.mapa.editBase; }
    if(e.target.id === 'hz-an'){ H.auto.n = e.target.value; }
    if(e.target.id === 'hz-vn'){ H.vivo.n = e.target.value; }
  });
  document.addEventListener('input', e => { if(e.target.id === 'hz-ab') H.auto.b = e.target.value.trim(); });

  /* ============================== 3. IA DE ABORDAGEM ============================== */
  const SEM_CREDITO = 'A IA do Corre ficou sem crédito na OpenAI. Quem cuida do Corre recarrega em platform.openai.com › Billing e ela volta na hora.';
  const IA_ERRO = { sem_chave: 'A IA ainda não foi ligada no Corre.', limite: 'Hoje já deu o limite da IA do Hórus. Amanhã tem mais.', login: 'Entra de novo pra usar a IA.', prompt: 'Cola a resposta do cliente primeiro.', provedor: 'A IA não conseguiu agora. Tenta de novo.' };
  const semCredito = e => !!e && (e.code === 'sem_credito' || /credit|quota|billing/i.test(String(e.detalhe || '')));
  const VERIFICAR = 'A conta da OpenAI precisa ser verificada pra usar esse modelo: platform.openai.com › Settings › Organization › Verify Organization. Leva uns minutos.';
  const naoVerificada = e => !!e && /must be verified|verify organization/i.test(String(e.detalhe || ''));
  const iaMsg = e => semCredito(e) ? SEM_CREDITO : naoVerificada(e) ? VERIFICAR : e && e.code === 'limite' ? C.limiteMsg(e, 'Hórus') : (e && (IA_ERRO[e.code] || (e.status === 404 && IA_ERRO.sem_chave))) || C.errMsg(e, 'A IA não conseguiu agora.');
  const LEIT = { interessado: 'Interessado', quer_saber_mais: 'Quer saber mais', pediu_preco: 'Pediu preço', objecao_preco: 'Achou caro', sem_tempo_agora: 'Sem tempo agora', ja_tem: 'Já tem', nao_e_comigo: 'Não é com ele', sem_interesse: 'Sem interesse', duvida: 'Dúvida', outro: 'Outro' };
  const saudacao = l => Z.oiEm((l && l.uf) || praca().uf);
  function ctxLead(l, tipo){
    const c = Z.cfg(), n = Z.nichoOf(l);
    return { saudacao: saudacao(l), eu: c.eu, oferta: c.oferta, cidade: l.cidade || praca().cidade || c.cidade, link_url: tipo === 'link' ? c.link : '', empresa: Z.shortName(l.nome), nicho: n.n, bairro: l.bairro || '', instagram: l.insta || '',
      sinais: Z.faroDe(l).map(k => Z.SINAIS[k].n), anotacoes: l.obs || '', etapa: Z.SN[l.st] || l.st, pergunta_que_doi: n.hook || '', o_que_resolve: n.valor || '', gancho: n.gancho || '', tipo_de_mensagem: Z.TN[tipo] || tipo, modelo_atual: Z.compose(l, tipo),
      historico: (l.hist || []).slice(0, 10).map(h => `${h.t ? C.ddmm(Z.localDay(h.t)) : ''}: ${h.v || h.k}`) };
  }
  function fakeAbordagem(l, tipo){
    const c = Z.cfg(), n = Z.nichoOf(l), nome = Z.shortName(l.nome);
    const dor = n.hook || `como a ${nome} faz pra chegar em cliente novo hoje?`;
    return { mensagem: `${saudacao(l)} ${c.eu} aqui, ${c.oferta}. Vi a ${nome}${l.bairro ? ' aí no ' + l.bairro : ''} e fiquei com uma pergunta: ${dor.replace(/\{empresa\}/g, nome)} ${n.valor ? n.valor + ' ' : ''}Posso te mostrar em 10 minutos essa semana?`.replace(/\s+/g, ' ').trim(),
      alternativa: `${saudacao(l)} Aqui é ${c.eu}. Tô falando com ${(n.n || 'empresas').toLowerCase()} de ${l.cidade || c.cidade} essa semana. ${n.gancho || 'Tenho uma ideia rápida pra vocês.'} Faz sentido eu passar aí?`.replace(/\s+/g, ' ').trim(),
      por_que: 'Demonstração: na versão de verdade a IA escreve olhando o nicho, o bairro e as anotações.' };
  }
  function fakeResposta(txt){
    const t = C.norm(txt);
    const k = /caro|preco|valor|quanto custa|quanto e/.test(t) ? (/caro/.test(t) ? 'objecao_preco' : 'pediu_preco') : /nao tenho interesse|nao quero|sem interesse|nao preciso/.test(t) ? 'sem_interesse' : /ja tenho|ja uso|ja temos/.test(t) ? 'ja_tem' : /nao sou eu|nao e comigo|fala com|falar com o/.test(t) ? 'nao_e_comigo' : /depois|semana que vem|agora nao|corrid/.test(t) ? 'sem_tempo_agora' : /manda|mais info|como funciona|me explica/.test(t) ? 'quer_saber_mais' : /sim|quero|pode|bora|topo|interess/.test(t) ? 'interessado' : 'duvida';
    const E = { interessado: ['interesse', 1], quer_saber_mais: ['interesse', 1], pediu_preco: ['link', 1], objecao_preco: ['interesse', 2], sem_tempo_agora: ['contato', 7], ja_tem: ['contato', 30], nao_e_comigo: ['contato', 1], sem_interesse: ['perdido', 0], duvida: ['contato', 1] }[k];
    return { leitura: k, resumo: `Demonstração: o cliente disse "${String(txt).slice(0, 60)}".`, etapa: E[0], retorno_em_dias: E[1], replica: k === 'sem_interesse' ? 'Tranquilo, obrigado pelo retorno! Se mudar alguma coisa, me chama aqui.' : 'Show! Te explico rapidinho: ' + (Z.cfg().oferta || 'o que eu faço') + '. Qual dia fica bom pra eu te mostrar em 10 minutos?', dica: 'Na versão de verdade a IA lê a resposta inteira e o histórico.' };
  }
  async function chamaIA(acao, l, extra){
    try{ return await C.iaFn(Object.assign({ acao, ctx: ctxLead(l, extra && extra.tipo || 'abordagem') }, extra && extra.resposta ? { resposta: extra.resposta } : {}), { oque: acao === 'resposta' ? 'uma leitura do Hórus' : 'uma mensagem do Hórus' }); }
    catch(e){ if(e && e.code === 'nofn' && C.DEMO) return acao === 'abordagem' ? fakeAbordagem(l, extra && extra.tipo) : fakeResposta(extra && extra.resposta); throw e; }
  }
  /* v4.24: a Mesa escreve com a IA direto na carta */
  TT.escreve = (l, tipo) => chamaIA('abordagem', l, { tipo: tipo || 'abordagem' });
  TT.iaErro = iaMsg;
  TT.leadBtns = l => C.visitas ? `<button type="button" class="btn sm" data-act="hz-vis" data-id="${l.id}">${ico('pin')} Marcar visita</button>` : '';
  TT.respHTML = l => {
    const vs = C.visitas ? C.visitas.doLead(l.id) : [];
    return `${vs.length ? `<div class="hz-lead-vis">${ico('pin')} <span>Visita ${esc(C.visitas.quando(vs[0]))}${vs[0].pauta ? ' · ' + esc(vs[0].pauta) : ''}</span><button type="button" class="btn sm ghost" data-act="vs-abrir" data-id="${vs[0].id}">Abrir</button></div>` : ''}
      <div class="hz-iares"><label for="hl-resp"><b>Ele respondeu?</b> <small>cola aqui o que ele mandou no WhatsApp</small></label>
        <textarea class="inp" id="hl-resp" rows="3" maxlength="1500" placeholder="Ex.: Quanto custa? Achei meio caro…"></textarea>
        <div class="acts"><button type="button" class="btn sm" id="hl-resp-go">${ico('star')} Ler com IA</button><span class="hint" id="hl-resp-st" aria-live="polite"></span></div>
        <div id="hl-resp-out"></div></div>`;
  };
  TT.onLead = function(l, panel){
    const ia = C.$('hl-ia'), txt = C.$('hl-txt'), st = C.$('hl-ia-st'), tpl = C.$('hl-tpl');
    let alt = '';
    const syncSend = () => { const s = C.$('hl-send'); if(s) s.href = Z.waUrl(l, txt.value); };
    if(ia) ia.addEventListener('click', async () => {
      ia.disabled = true; const rot = ia.innerHTML; ia.innerHTML = `${ico('star')} Escrevendo…`; st.className = 'hint'; st.textContent = 'A IA tá escrevendo pra ' + Z.shortName(l.nome) + '…';
      try{
        const r = await chamaIA('abordagem', l, { tipo: tpl.value });
        txt.value = r.mensagem; alt = r.alternativa || ''; H.ia[l.id] = true; syncSend();
        st.innerHTML = `${esc(r.por_que || 'Mensagem sob medida.')}${alt ? ' <button type="button" class="lnk" id="hl-ia-alt">Ver outra versão</button>' : ''}${r.restam != null ? ` <span class="hz-muted">· ${r.restam} hoje</span>` : ''}`;
        const b = C.$('hl-ia-alt'); if(b) b.addEventListener('click', () => { const t = txt.value; txt.value = alt; alt = t; syncSend(); });
      }catch(e){ st.className = 'hint bad'; st.textContent = iaMsg(e); }
      finally{ ia.disabled = false; ia.innerHTML = rot; }
    });
    txt.addEventListener('input', () => { /* editou: continua contando como IA se veio dela */ });
    const go = C.$('hl-resp-go'); if(!go) return;
    go.addEventListener('click', async () => {
      const resp = C.$('hl-resp').value.trim(), s2 = C.$('hl-resp-st');
      if(!resp){ C.toast('Cola a resposta do cliente primeiro.'); C.$('hl-resp').focus(); return; }
      go.disabled = true; s2.className = 'hint'; s2.textContent = 'Lendo a resposta…';
      try{ const r = await chamaIA('resposta', l, { tipo: Z.nextMsg(l) ? Z.nextMsg(l).k : 'interesse', resposta: resp }); s2.textContent = ''; mostraLeitura(l, r, resp); }
      catch(e){ s2.className = 'hint bad'; s2.textContent = iaMsg(e); }
      finally{ go.disabled = false; }
    });
  };
  function mostraLeitura(l, r, resp){
    const out = C.$('hl-resp-out'); if(!out) return;
    const quando = d => d <= 0 ? 'hoje' : d === 1 ? 'amanhã' : `em ${d} dias (${C.ddmm(Z.addDays(d))})`;
    out.innerHTML = `<div class="hz-leitura t-${esc(r.leitura)}"><div class="hz-leit-h"><span class="hz-tag">${esc(LEIT[r.leitura] || r.leitura)}</span><p>${esc(r.resumo)}</p></div>
      <div class="fld"><label for="hl-rep">Réplica</label><textarea class="inp" id="hl-rep" rows="5" maxlength="1200">${esc(r.replica)}</textarea></div>
      <div class="acts"><a class="btn pri" id="hl-rep-wa" href="${esc(Z.waUrl(l, r.replica))}" target="_blank" rel="noopener">${ico('wa')} Enviar réplica no WhatsApp</a><button type="button" class="btn" id="hl-rep-cp">${ico('copy')} Copiar</button></div>
      <div class="hz-leit-p"><span>Próximo passo: <b>${esc(Z.SN[r.etapa] || r.etapa)}</b> · falar de novo ${esc(quando(r.retorno_em_dias))}</span><button type="button" class="btn sm" id="hl-apply">Aplicar no lead</button></div>
      ${r.dica ? `<p class="hint">${esc(r.dica)}</p>` : ''}</div>`;
    let aplicado = false;
    const aplica = async (silencio) => {
      if(aplicado) return; aplicado = true;
      Z.logH(l, 'res', `Respondeu · ${LEIT[r.leitura] || r.leitura}: ${String(r.resumo || resp).slice(0, 120)}`);
      if(r.etapa && r.etapa !== l.st){ l.st = r.etapa; Z.logH(l, 'st', `Etapa: ${Z.SN[r.etapa]}`); }
      l.prox = Z.DONE.includes(l.st) ? null : Z.addDays(Math.max(0, r.retorno_em_dias || 0));
      l.cad = l.cad ? Object.assign({}, l.cad, { fim: Z.today() }) : l.cad;
      if(await Z.save(l, ['st', 'prox', 'cad', 'hist'])){ if(!silencio) C.toast(`${Z.shortName(l.nome)}: ${Z.SN[l.st]}${l.prox ? ', retomar ' + C.ddmm(l.prox) : ''}.`); Z.paint(); }
    };
    const rep = C.$('hl-rep'), wa = C.$('hl-rep-wa');
    rep.addEventListener('input', () => { wa.href = Z.waUrl(l, rep.value); });
    wa.addEventListener('click', async () => { await aplica(true); Z.logH(l, 'toque', 'WhatsApp · Réplica · IA'); await Z.save(l, ['hist']); C.toast('Réplica enviada e lead atualizado.'); Z.paint(); });
    C.$('hl-rep-cp').addEventListener('click', () => C.copy(rep.value, 'Réplica copiada.'));
    C.$('hl-apply').addEventListener('click', async () => { await aplica(false); Z.leadSheet(l.id); });
  }

  /* ============================== 4. PLACAR QUE VENDE ============================== */
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  /* a hora que a empresa recebeu, no fuso dela */
  const horaBR = (t, uf) => Z.horaEm(uf, new Date(t)).h;
  const dowBR = t => new Date(Z.localDay(t) + 'T12:00:00Z').getUTCDay();
  const respondeu = h => h.k === 'res' && !/^Sem resposta/.test(h.v || '');
  function rotulo(v){
    const p = String(v || '').split(' · '), canal = p[0], ia = p.includes('IA');
    if(/Liga/.test(canal)) return 'Ligação';
    const m = p.slice(1).filter(x => x !== 'IA').join(' · ') || 'Mensagem';
    return m + (ia ? ' · IA' : '');
  }
  function numeros(){
    const L = H.leads, N = {}, CI = {}, Mm = {}, HR = { manha: [0, 0], tarde: [0, 0], noite: [0, 0] }, DW = Array.from({ length: 7 }, () => [0, 0]);
    let toques = 0, fechTot = 0, chegouInt = 0, intFech = 0;
    const ym = Z.today().slice(0, 7), fechMes = new Set();
    L.forEach(l => {
      const k = l.nicho || '', o = N[k] || (N[k] = { k, n: Z.nichoOf(l).n, leads: 0, toc: 0, resp: 0, int: 0, fech: 0 });
      const h = (l.hist || []).slice().reverse();
      const tocou = h.some(x => x.k === 'toque'), resp = h.some(respondeu), int = ['interesse', 'link', 'fechado'].includes(l.st) || h.some(x => x.k === 'st' && /Interessado|Proposta|Fechado/.test(x.v || ''));
      o.leads++; if(tocou) o.toc++; if(resp) o.resp++; if(int) o.int++; if(l.st === 'fechado') o.fech++;
      const ck = Z.lugarDe(l) || '—', ci = CI[ck] || (CI[ck] = { k: ck, n: ck === '—' ? 'Sem cidade' : ck, leads: 0, toc: 0, resp: 0, int: 0, fech: 0 });
      ci.leads++; if(tocou) ci.toc++; if(resp) ci.resp++; if(int) ci.int++; if(l.st === 'fechado') ci.fech++;
      if(l.st === 'fechado') fechTot++;
      if(int){ chegouInt++; if(l.st === 'fechado') intFech++; }
      h.forEach(x => { if(x.k === 'st' && /Fechado/.test(x.v || '') && x.t && Z.localDay(x.t).slice(0, 7) === ym) fechMes.add(l.id); });
      for(let i = 0; i < h.length; i++){
        const x = h[i]; if(x.k !== 'toque' || !x.t) continue; toques++;
        let r = false; for(let j = i + 1; j < h.length; j++){ if(h[j].k === 'toque') break; if(respondeu(h[j])){ r = true; break; } }
        const lab = rotulo(x.v), m = Mm[lab] || (Mm[lab] = { lab, ia: / · IA$/.test(lab), env: 0, resp: 0 }); m.env++; if(r) m.resp++;
        const hr = horaBR(x.t, l.uf), b = hr < 12 ? 'manha' : hr < 18 ? 'tarde' : 'noite'; HR[b][0]++; if(r) HR[b][1]++;
        const d = dowBR(x.t); DW[d][0]++; if(r) DW[d][1]++;
      }
    });
    const interesse = L.filter(l => l.st === 'interesse').length, proposta = L.filter(l => l.st === 'link').length;
    return { N: Object.values(N).filter(o => o.toc || o.leads >= 3).sort((a, b) => b.fech - a.fech || pct(b.resp, b.toc) - pct(a.resp, a.toc) || b.leads - a.leads),
      CI: Object.values(CI).sort((a, b) => b.fech - a.fech || pct(b.resp, b.toc) - pct(a.resp, a.toc) || b.leads - a.leads),
      M: Object.values(Mm).sort((a, b) => b.env - a.env), HR, DW, toques, fechTot, chegouInt, intFech, fechMes: fechMes.size, fechMesIds: fechMes, interesse, proposta };
  }
  const barra = (v, max) => `<span class="hz-vbar"><i style="width:${max ? Math.round(v / max * 100) : 0}%"></i></span>`;
  function pintaVende(){
    const el = C.$('hz-vende'); if(!el) return;
    const c = Z.cfg(), n = numeros(), valor = +c.valorFech || 0, metaF = +c.metaFech || 0;
    const taxaInt = n.chegouInt >= 5 ? n.intFech / n.chegouInt : null;
    const pInt = taxaInt != null ? taxaInt : .25, pLink = taxaInt != null ? Math.min(.9, taxaInt * 2) : .5;
    /* v4.16: cada negócio com o valor dele (o do cartão no funil ou o orçamento nas Vendas); sem valor, o ganho por fechamento */
    const VL = l => C.horusFunil ? C.horusFunil.valorDe(l, true).v : valor;
    const garantido = H.leads.filter(l => n.fechMesIds.has(l.id)).reduce((s, l) => s + VL(l), 0);
    const mesa = H.leads.reduce((s, l) => s + (l.st === 'interesse' ? VL(l) * pInt : l.st === 'link' ? VL(l) * pLink : 0), 0);
    const comValor = valor || H.leads.some(l => Number(l.valor) > 0);
    const porFech = n.fechTot ? n.toques / n.fechTot : null, falta = Math.max(0, metaF - n.fechMes);
    const melhorN = n.N.filter(o => o.toc >= 3).sort((a, b) => pct(b.fech, b.toc) - pct(a.fech, a.toc) || pct(b.resp, b.toc) - pct(a.resp, a.toc))[0];
    const HRn = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }, hrs = Object.entries(n.HR).map(([k, [e, r]]) => ({ k, e, r, t: pct(r, e) }));
    const bestH = hrs.filter(x => x.e >= 5).sort((a, b) => b.t - a.t)[0];
    const DWn = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'], bestD = n.DW.map(([e, r], i) => ({ i, e, t: pct(r, e) })).filter(x => x.e >= 5).sort((a, b) => b.t - a.t)[0];
    const ia = n.M.filter(m => m.ia), mod = n.M.filter(m => !m.ia && m.lab !== 'Ligação');
    const soma = (xs, k) => xs.reduce((s, m) => s + m[k], 0);
    const maxN = Math.max(1, ...n.N.map(o => o.toc)), maxM = Math.max(1, ...n.M.map(m => m.env)), maxH = Math.max(1, ...hrs.map(x => x.e));
    el.innerHTML = `<div class="hz-h"><h2>Placar que vende</h2><span>onde, com que mensagem e em que hora o corre rende</span></div>
      ${n.toques < 10 ? `<p class="hz-help">Com ${n.toques} ${n.toques === 1 ? 'toque' : 'toques'} registrados o placar ainda tá esquentando. Cada mensagem enviada pelo Hórus e cada "Respondeu" deixam ele mais afiado.</p>` : ''}
      <div class="hz-vgrid">
        <section class="hz-vcard money"><h3>O mês em grana</h3>
          ${comValor ? `<div class="hz-vnum"><div><b class="num">${C.money(garantido)}</b><small>garantido · ${n.fechMes} ${n.fechMes === 1 ? 'fechado' : 'fechados'} no mês</small></div><div><b class="num">${C.money(mesa)}</b><small>na mesa · ${n.interesse} interessados e ${n.proposta} com proposta</small></div><div><b class="num">${C.money(garantido + mesa)}</b><small>previsão do mês</small></div></div>
            ${metaF ? `<div class="hz-bar" role="img" aria-label="${n.fechMes} de ${metaF} fechamentos"><i style="width:${Math.min(100, pct(n.fechMes, metaF))}%"></i></div><p class="hz-wk">${n.fechMes} de ${metaF} fechamentos na meta${falta ? ` · faltam ${falta}${porFech ? `, uns ${Math.ceil(falta * porFech)} toques no teu ritmo (1 fechamento a cada ${Math.round(porFech)})` : ''}` : ' · meta batida'}</p>` : ''}
            <p class="hz-help">A mesa conta ${taxaInt != null ? `a tua taxa: ${pct(n.intFech, n.chegouInt)}% de quem se interessou fechou` : 'um chute: 1 em 4 interessados e 1 em 2 propostas fecham'}.</p>`
          : '<p class="hz-help">Diz quanto você ganha por fechamento e a meta do mês, e o Hórus mostra o garantido, o que tá na mesa e a previsão.</p>'}
          <div class="hz-vform"><div class="fld"><label class="hz-lbl" for="hz-vv">Ganho por fechamento (R$)</label><input class="hz-in" id="hz-vv" inputmode="decimal" value="${valor ? String(valor).replace('.', ',') : ''}" placeholder="0,00"></div><div class="fld"><label class="hz-lbl" for="hz-vm">Meta de fechamentos no mês</label><input class="hz-in" id="hz-vm" type="number" min="0" max="999" value="${metaF || ''}" placeholder="10"></div><button type="button" class="hz-btn" data-act="hz-vsalva">Salvar</button></div>
        </section>
        <section class="hz-vcard"><h3>Por nicho</h3>${melhorN ? `<p class="hz-vdest">Onde rende: <b>${esc(melhorN.n)}</b> · ${pct(melhorN.resp, melhorN.toc)}% respondem, ${pct(melhorN.fech, melhorN.toc)}% fecham</p>` : ''}
          ${n.N.length ? `<div class="hz-vtab" role="table" aria-label="Conversão por nicho"><div class="hz-vrow h" role="row"><span role="columnheader">Nicho</span><span role="columnheader">Tocados</span><span role="columnheader">Resposta</span><span role="columnheader">Fecham</span></div>
            ${n.N.slice(0, 8).map(o => `<div class="hz-vrow" role="row"><span role="cell"><b>${esc(o.n)}</b>${barra(o.toc, maxN)}</span><span role="cell" class="num">${o.toc}<small>/${o.leads}</small></span><span role="cell" class="num">${pct(o.resp, o.toc)}%</span><span role="cell" class="num">${o.fech ? `${o.fech} · ${pct(o.fech, o.toc)}%` : '0'}</span></div>`).join('')}</div>` : '<p class="hz-muted">Ainda sem toques.</p>'}</section>
        ${n.CI.length > 1 ? (() => { const maxC = Math.max(1, ...n.CI.map(o => o.toc)), melhorC = n.CI.filter(o => o.toc >= 3).sort((a, b) => pct(b.fech, b.toc) - pct(a.fech, a.toc) || pct(b.resp, b.toc) - pct(a.resp, a.toc))[0];
          return `<section class="hz-vcard"><h3>Por cidade</h3>${melhorC ? `<p class="hz-vdest">Onde rende: <b>${esc(melhorC.n)}</b> · ${pct(melhorC.resp, melhorC.toc)}% respondem, ${pct(melhorC.fech, melhorC.toc)}% fecham</p>` : ''}
          <div class="hz-vtab" role="table" aria-label="Conversão por cidade"><div class="hz-vrow h" role="row"><span role="columnheader">Cidade</span><span role="columnheader">Tocados</span><span role="columnheader">Resposta</span><span role="columnheader">Fecham</span></div>
          ${n.CI.slice(0, 8).map(o => `<div class="hz-vrow" role="row"><span role="cell"><b>${esc(o.n)}</b>${barra(o.toc, maxC)}</span><span role="cell" class="num">${o.toc}<small>/${o.leads}</small></span><span role="cell" class="num">${pct(o.resp, o.toc)}%</span><span role="cell" class="num">${o.fech ? `${o.fech} · ${pct(o.fech, o.toc)}%` : '0'}</span></div>`).join('')}</div></section>`; })() : ''}
        <section class="hz-vcard"><h3>Por mensagem</h3>
          ${ia.length && mod.length ? `<p class="hz-vdest">Com IA: <b>${pct(soma(ia, 'resp'), soma(ia, 'env'))}%</b> respondem · modelo: <b>${pct(soma(mod, 'resp'), soma(mod, 'env'))}%</b></p>` : ''}
          ${n.M.length ? `<div class="hz-vtab" role="table" aria-label="Resposta por mensagem"><div class="hz-vrow h" role="row"><span role="columnheader">Mensagem</span><span role="columnheader">Enviadas</span><span role="columnheader">Respondidas</span><span role="columnheader">Taxa</span></div>
            ${n.M.slice(0, 8).map(m => `<div class="hz-vrow" role="row"><span role="cell"><b>${esc(m.lab)}</b>${barra(m.env, maxM)}</span><span role="cell" class="num">${m.env}</span><span role="cell" class="num">${m.resp}</span><span role="cell" class="num">${pct(m.resp, m.env)}%</span></div>`).join('')}</div>` : '<p class="hz-muted">Ainda sem mensagens enviadas.</p>'}</section>
        <section class="hz-vcard"><h3>Melhor hora</h3>
          ${bestH ? `<p class="hz-vdest">Manda de <b>${HRn[bestH.k].toLowerCase()}</b> (no horário de cada cidade)${bestD ? `, de preferência <b>${DWn[bestD.i]}</b>` : ''}: é quando mais respondem.</p>` : ''}
          <div class="hz-vhoras">${hrs.map(x => `<div><span>${HRn[x.k]}</span>${barra(x.e, maxH)}<b class="num">${x.e ? pct(x.r, x.e) + '%' : '–'}</b><small>${x.e} ${x.e === 1 ? 'envio' : 'envios'}</small></div>`).join('')}</div>
          <div class="hz-vdias" aria-label="Resposta por dia da semana">${n.DW.map(([e, r], i) => `<span class="${bestD && bestD.i === i ? 'on' : ''}" title="${DWn[i]}: ${e} envios, ${pct(r, e)}% de resposta"><i style="height:${e ? Math.max(6, pct(r, e)) : 0}%"></i><em>${DWn[i].slice(0, 3)}</em></span>`).join('')}</div></section>
      </div>`;
  }

  /* ============================== ações e ganchos ============================== */
  TT.paint = function(){ pintaMapaCard(); pintaVende(); };
  /* quantos toques viram 1 fechamento, no histórico da pessoa (o card do mês traduz vendas em toques) */
  TT.ritmo = async function(){
    if(!H.loaded) await Z.load();
    const n = numeros(); return n.fechTot >= 1 && n.toques >= n.fechTot ? n.toques / n.fechTot : null;
  };
  TT.visitasMudaram = function(){ if(C.$('hz-root')) { pintaRota(); } };
  Object.assign(C.acts, {
    'hz-auto': () => cacar(),
    'hz-mf': el => { H.mapa.f = el.dataset.k; M.fit = true; pintaMapaCard(); },
    'hz-vivo': () => cacarVivo(),
    'hz-vivo-r': el => { H.vivo.r = +el.dataset.k; if(H.vivo.rows) cacarVivo(); else Z.paintCaca(); },
    'hz-vivo-add': async el => { const r = (H.vivo.rows || [])[+el.dataset.i]; if(!r || r.dup) return; el.disabled = true; try{ await vivoAdd([r]); C.toast(`${r.nome} no radar.`); Z.paint(); }catch(e){ C.toast(C.errMsg(e)); el.disabled = false; } },
    'hz-vivo-todos': async el => { const rs = (H.vivo.rows || []).filter(r => !r.dup); if(!rs.length) return; el.disabled = true; try{ const n = await vivoAdd(rs); C.toast(`${n} no radar.`); Z.paint(); }catch(e){ C.toast(C.errMsg(e)); el.disabled = false; } },
    'hz-vivo-entrei': async el => {
      const r = (H.vivo.rows || [])[+el.dataset.i]; if(!r) return; el.disabled = true;
      try{
        if(!r.dup) await vivoAdd([r]);
        const l = leadDaLinha(r); if(!l){ C.toast('Não achei essa empresa no radar.'); return; }
        Z.logH(l, 'visita', 'Visita: entrei (porta a porta)'); if(l.st === 'novo') l.st = 'contato'; l.prox = Z.addDays(2);
        await Z.save(l, ['hist', 'st', 'prox']);
        C.toast(`Check-in na ${Z.shortName(l.nome)}. O Hórus te lembra de voltar em 2 dias.`, 3600); Z.paint();
      }catch(e){ C.toast(C.errMsg(e)); el.disabled = false; }
    },
    'hz-mpc': el => { H.mapa.pc = el.dataset.k; H.mapa.rota = null; M.fit = true; pintaMapaCard(); },
    'hz-rsel': el => { const id = el.dataset.id; H.mapa.sel[id] = !H.mapa.sel[id]; if(M.map) M.map.closePopup(); pintaMapaCard(); C.toast(H.mapa.sel[id] ? 'Entrou na rota. Em "Quem entra", escolhe "Os que eu marquei".' : 'Saiu da rota.'); },
    'hz-rota': async el => { el.disabled = true; try{ await montarRota(); }finally{ el.disabled = false; } },
    'hz-rbase': async el => {
      const t = (C.$('hz-rb').value || '').trim(); if(t.length < 5){ C.toast('Coloca rua, número e bairro.'); return; }
      el.disabled = true;
      try{ const g = await geo(`${t}, ${cidadeQ()}`); if(!g){ C.toast('Não achei esse endereço no mapa. Tenta com o bairro.'); return; } await Z.saveCfg({ base: { txt: t.slice(0, 120), lat: g.lat, lng: g.lng } }); H.mapa.editBase = false; C.toast('Endereço base salvo.'); pintaMapaCard(); C.$('hz-rs').value = 'base'; }
      catch(e){ C.toast(C.errMsg(e, 'Não deu pra salvar o endereço agora.')); }
      finally{ el.disabled = false; }
    },
    'hz-geo': el => localizar(el),
    'hz-ragenda': () => { const f = C.$('hz-ragenda'); if(f){ f.hidden = !f.hidden; if(!f.hidden) C.$('hz-rd').focus(); } },
    'hz-ragendar': el => agendarRota(el),
    'hz-vis': el => {
      const l = H.by[el.dataset.id]; if(!l || !C.visitas) return;
      C.visitas.editor(null, null, { lead: l, pauta: 'Visita de prospecção', onSave: async v => {
        if(!v || !v.data || v.lead_id !== l.id) return;
        if(!(l.hist || []).some(h => h.k === 'visita' && h.v && h.v.includes(v.data) && h.v.includes(v.hora))){
          Z.logH(l, 'visita', `Visita marcada: ${C.visitas.dia(v.data)} às ${v.hora}`); if(!l.prox || l.prox > v.data) l.prox = v.data;
          await Z.save(l, ['hist', 'prox']); Z.paint();
        }
      } });
    },
    'hz-vsalva': async () => {
      const bruto = String(C.$('hz-vv').value || ''), v = (C.catalogo && C.catalogo.parseReais ? C.catalogo.parseReais(bruto) : Number(bruto.replace(/\./g, '').replace(',', '.'))) || 0, m = Math.max(0, Math.min(999, Math.round(+C.$('hz-vm').value || 0)));
      try{ await Z.saveCfg({ valorFech: Math.max(0, Math.min(1e7, v)), metaFech: m }); C.toast('Placar ajustado.'); pintaVende(); }catch(e){ C.toast(C.errMsg(e)); }
    }
  });
  C.horusTurbo = TT;
})();
