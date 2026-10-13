// CORRE · função "banca" (Supabase Edge Function)
// Junta as manchetes dos feeds RSS públicos das publicações, por tema, e procura
// assuntos livres nesses feeds e no GDELT (base aberta de notícias do mundo).
// Não usa banco nem chave secreta. Cache de 20 minutos por feed.
//
// Deploy pelo painel: Supabase > Edge Functions > Deploy a new function > Via Editor
// > nome: banca > cole este arquivo inteiro > Deploy function.

type Item = { t: string; u: string; f: string; d: string };
type Tema = { feeds: string[]; filtro?: RegExp };

const TEMAS: Record<string, Tema> = {
  publicidade: { feeds: ["https://www.b9.com.br/feed/", "https://www.meioemensagem.com.br/feed", "https://propmark.com.br/feed/"] },
  redes: {
    feeds: ["https://www.socialmediatoday.com/feeds/news/", "https://tecnoblog.net/feed/"],
    filtro: /instagram|tiktok|reels|threads|youtube|whatsapp|facebook|meta\b|linkedin|bluesky|\bx\b|twitter|creator|criador|influenc|social/i,
  },
  tecnologia: { feeds: ["https://tecnoblog.net/feed/", "https://www.theverge.com/rss/index.xml"] },
  negocios: { feeds: ["https://startups.com.br/feed/"] },
  futebol: { feeds: ["https://trivela.com.br/feed/"] },
  streetwear: { feeds: ["https://hypebeast.com/feed", "https://sneakernews.com/feed/", "https://www.highsnobiety.com/feed/"] },
  musica: {
    feeds: ["https://www.tenhomaisdiscosqueamigos.com/feed/", "https://rollingstone.com.br/feed/", "https://pitchfork.com/feed/feed-news/rss"],
    filtro: /m[uú]sica|disco|[aá]lbum|album|rap|trap|hip.?hop|funk|show|single|clipe|turn[eê]|banda|cantor|cantora|faixa|lan[cç]a|song|tour|record|mixtape|festival/i,
  },
  cinema: {
    feeds: ["https://rollingstone.com.br/feed/", "https://www.indiewire.com/feed/"],
    filtro: /filme|s[eé]rie|cinema|trailer|estreia|netflix|hbo|max\b|disney|prime video|oscar|diretor|diretora|film|series|movie|box office|festival/i,
  },
  games: { feeds: ["https://www.polygon.com/rss/index.xml", "https://www.animenewsnetwork.com/all/rss.xml"] },
  comida: { feeds: ["https://www.eater.com/rss/index.xml"] },
  design: { feeds: ["https://www.dezeen.com/feed/", "https://www.designboom.com/feed/", "https://www.creativeboom.com/feed/"] },
  arte: { feeds: ["https://www.thisiscolossal.com/feed/", "https://petapixel.com/feed/"] },
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const TTL = 20 * 60 * 1000;
const cache = new Map<string, { at: number; itens: Item[] }>();

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”" };
const ents = (s: string) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
function decode(s: string): string {
  // duas passadas: tem feed que manda "&amp;amp;"
  return ents(ents(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}
function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}
function linkOf(block: string): string {
  const rss = tag(block, "link");
  if (/^https?:\/\//.test(rss)) return rss;
  const alt = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) || block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return alt ? alt[1].replace(/&amp;/g, "&") : "";
}
function dateOf(block: string): string {
  const raw = tag(block, "pubDate") || tag(block, "published") || tag(block, "updated") || tag(block, "dc:date");
  const t = Date.parse(raw);
  return Number.isFinite(t) ? new Date(t).toISOString() : "";
}
function fonteOf(xml: string, url: string): string {
  const head = xml.split(/<item[\s>]|<entry[\s>]/i)[0];
  const t = tag(head, "title").split(/\s[|–—-]\s|:\s/)[0].trim();
  return t || new URL(url).hostname.replace(/^www\./, "");
}
export function parse(xml: string, url: string): Item[] {
  const f = fonteOf(xml, url);
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return blocks.map((b) => ({ t: tag(b, "title"), u: linkOf(b), f, d: dateOf(b) })).filter((i) => i.t && /^https?:\/\//.test(i.u));
}

async function feed(url: string): Promise<Item[]> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL) return hit.itens;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { "user-agent": "CorreBanca/1.0 (+https://app.corresocial.com)", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5" } });
    if (!r.ok) throw new Error(String(r.status));
    const itens = parse(await r.text(), url).slice(0, 40);
    cache.set(url, { at: Date.now(), itens });
    return itens;
  } catch {
    return hit ? hit.itens : [];
  } finally {
    clearTimeout(timer);
  }
}

async function gdelt(q: string): Promise<Item[]> {
  const key = "gdelt:" + q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.itens;
  const run = async (query: string) => {
    const u = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=12&format=json&sort=datedesc&timespan=7d`;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 7000);
    try {
      const r = await fetch(u, { signal: ctl.signal });
      const txt = await r.text();
      if (!txt.trim().startsWith("{")) return [];
      const j = JSON.parse(txt);
      return (j.articles || []).map((a: Record<string, string>) => {
        const s = a.seendate || "";
        const iso = s.length >= 15 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z` : "";
        return { t: decode(a.title || ""), u: a.url, f: (a.domain || "").replace(/^www\./, ""), d: iso };
      }).filter((i: Item) => i.t && i.u);
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  };
  const termo = q.includes(" ") ? `"${q}"` : q;
  let itens = await run(`${termo} sourcelang:portuguese`);
  if (itens.length < 3) itens = itens.concat(await run(termo));
  cache.set(key, { at: Date.now(), itens });
  return itens;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function top(itens: Item[], n: number): Item[] {
  const seenU = new Set<string>(), seenT = new Set<string>(), limite = Date.now() - 6 * 864e5;
  return itens
    .filter((i) => !i.d || Date.parse(i.d) > limite)
    .sort((a, b) => (b.d || "").localeCompare(a.d || ""))
    .filter((i) => {
      const k = norm(i.t).slice(0, 80);
      if (seenU.has(i.u) || seenT.has(k)) return false;
      seenU.add(i.u); seenT.add(k);
      return true;
    })
    .slice(0, n);
}
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body: { temas?: unknown; assuntos?: unknown } = {};
  try { body = await req.json(); } catch { /* corpo vazio: edição padrão */ }
  const temas = (Array.isArray(body.temas) ? body.temas : ["publicidade", "redes", "streetwear", "musica", "design"])
    .map(String).filter((k) => TEMAS[k]).slice(0, 12);
  const assuntos = (Array.isArray(body.assuntos) ? body.assuntos : [])
    .map((s) => String(s).replace(/\s+/g, " ").trim().slice(0, 40)).filter((s) => s.length >= 3).slice(0, 10);

  // com assunto livre, lê todos os feeds (eles ficam em cache) pra achar o assunto onde ele aparecer
  const lista = assuntos.length ? Object.keys(TEMAS) : temas;
  const urls = [...new Set(lista.flatMap((k) => TEMAS[k].feeds))];
  const lidos = Object.fromEntries(await Promise.all(urls.map(async (u) => [u, await feed(u)] as const)));

  const out: { geradoEm: string; temas: Record<string, Item[]>; assuntos: Record<string, Item[]> } = { geradoEm: new Date().toISOString(), temas: {}, assuntos: {} };
  for (const k of temas) {
    const T = TEMAS[k];
    let itens = T.feeds.flatMap((u) => lidos[u] || []);
    if (T.filtro) itens = itens.filter((i) => T.filtro!.test(i.t));
    out.temas[k] = top(itens, 8);
  }
  const todos = Object.values(lidos).flat();
  await Promise.all(assuntos.map(async (a) => {
    const n = norm(a);
    const locais = todos.filter((i) => norm(i.t).includes(n));
    out.assuntos[a] = top(locais.concat(await gdelt(a)), 8);
  }));
  return json(out);
});
