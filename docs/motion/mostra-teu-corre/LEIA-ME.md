# Mostra teu corre · o motion do Corre

Vertical 1080×1920, 30 fps, 33 s, pra Reels, Stories e TikTok. Feito em 24/10/2026 e subido pro Descript
(projeto "Corre · Mostra teu corre"), onde dá pra cortar, legendar e publicar.

Tudo é desenhado em código (canvas) e a trilha é composta e sintetizada no navegador (WebAudio): nada de
banco de imagem, de fonte paga ou de música de terceiro. As fontes vêm do Google Fonts (as mesmas do app:
Archivo, Bagel Fat One, IBM Plex Mono, Silkscreen). Nada de verde, como no app.

## O roteiro (120 bpm, cada tempo é 0,5 s)

| tempo | cena |
|---|---|
| 0 a 4 s | o gancho: QUEM VIVE / DO PRÓPRIO / CORRE / NÃO TEM / EXPEDIENTE. (o "9H ÀS 18H" riscado) |
| 4 a 8 s | o drop: o ícone bate, CORRE, chovem os adesivos das ferramentas, "TUDO NUM APP SÓ." |
| 8 a 12 s | Hórus: a carta OURO, calor 92, o WhatsApp, ENVIADO |
| 12 a 16 s | Studio: o mês programado, o aviso da hora de postar, feed/carrossel/story/reels |
| 16 a 20 s | Atendente 24h: 3h12 da manhã, a IA responde, cliente novo no Hórus |
| 20 a 24 s | Grana: o orçamento imprimindo, APROVADO, o corre do mês subindo |
| 24 a 28 s | a rajada: Caderninho, Link na bio, Mural, Piloto automático, Correverso, bicho, rede social |
| 28 a 33 s | o final: a Monstra atrás de Londrina, CORRE, MOSTRA TEU CORRE., app.corresocial.com, "começa de graça" |

Os nomes, números e conversas da tela são de exemplo (Barbearia do Neto, Júlia, R$ 14.870).

## Pra gerar de novo

Precisa do Node com Playwright (o Chromium) e do ffmpeg.

```
node render.cjs "$PWD" video-sem-som.mp4      # os 990 quadros, direto pro H.264
node gera-som.cjs "$PWD"                       # a trilha em trilha.wav
ffmpeg -i video-sem-som.mp4 -i trilha.wav -c:v copy -c:a aac -b:a 320k -shortest corre-mostra-teu-corre.mp4
node quadros.cjs "$PWD" 1.0 8.75 31.5          # só uns quadros, pra conferir (vão pra q/)
```

`render(t)` no `motion.html` desenha o quadro do segundo `t` (nada depende do relógio). Os tempos dos golpes
moram nos dois arquivos: `IMP` (os tremores) e as cenas no `motion.html`, a partitura no fim do `som.html`.
Mexeu num, confere o outro.
