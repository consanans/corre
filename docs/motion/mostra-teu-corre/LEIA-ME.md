# Mostra teu corre · o motion do Corre

Vertical 1080×1920, 30 fps, 44 s a 90 bpm, pra Reels, Stories e TikTok. Feito em 24/10/2026 e subido pro
Descript (projeto "Corre · Mostra teu corre (motion)"), onde dá pra cortar, legendar e publicar. A primeira
versão era de 120 bpm e 33 s; o Thales achou rápida e ela ficou no Descript como a outra timeline.

Tudo é desenhado em código (canvas) e a trilha é composta e sintetizada no navegador (WebAudio): nada de
banco de imagem, de fonte paga ou de música de terceiro. As fontes vêm do Google Fonts (as mesmas do app:
Archivo, Bagel Fat One, IBM Plex Mono, Silkscreen). Nada de verde, como no app.

## O roteiro (90 bpm, cada tempo é 0,67 s)

| tempo | cena |
|---|---|
| 0 a 5,3 s | o gancho: QUEM VIVE / DO PRÓPRIO / CORRE / NÃO TEM / EXPEDIENTE. (o "9H ÀS 18H" riscado) |
| 5,3 a 10,7 s | o drop: o ícone bate, CORRE, chovem os adesivos das ferramentas, "TUDO NUM APP SÓ." |
| 10,7 a 16 s | Hórus: a carta OURO, calor 92, o WhatsApp, ENVIADO |
| 16 a 21,3 s | Studio: o mês programado, o aviso da hora de postar, feed/carrossel/story/reels |
| 21,3 a 26,7 s | Atendente 24h: 3h12 da manhã, a IA responde, cliente novo no Hórus |
| 26,7 a 32 s | Grana: o orçamento imprimindo, APROVADO, o corre do mês subindo |
| 32 a 37,3 s | a rajada: Caderninho, Link na bio, Mural, Piloto automático, Correverso, bicho, rede social |
| 37,3 a 44 s | o final: a Monstra atrás de Londrina, CORRE, MOSTRA TEU CORRE., app.corresocial.com, "começa de graça" |

Os nomes, números e conversas da tela são de exemplo (Barbearia do Neto, Júlia, R$ 14.870).

## O andamento

As cenas e a partitura tão escritas em segundos de 120 bpm (um tempo = 0,5 s) e um número estica tudo junto:
`BPM` no fim do `motion.html` e no começo do `som.html` (hoje 90). Mudou o andamento, muda nos dois; o vídeo e a
trilha continuam batendo. Os clarões são brancos e o texto entra opaco de propósito: amarelo meio transparente
em cima do céu azul vira verde.

## Pra gerar de novo

Precisa do Node com Playwright (o Chromium) e do ffmpeg.

```
node render.cjs "$PWD" video-sem-som.mp4      # os 1320 quadros, direto pro H.264
node gera-som.cjs "$PWD"                       # a trilha em trilha.wav
ffmpeg -i video-sem-som.mp4 -i trilha.wav -c:v copy -c:a aac -b:a 320k -shortest corre-mostra-teu-corre.mp4
node quadros.cjs "$PWD" 1.0 8.75 31.5          # só uns quadros, pra conferir (vão pra q/)
```

`render(t)` no `motion.html` desenha o quadro do segundo `t` do vídeo (nada depende do relógio); por dentro,
`quadro()` recebe o tempo em 120 bpm. Os tempos dos golpes moram nos dois arquivos: `IMP` (os tremores) e as
cenas no `motion.html`, a partitura no fim do `som.html`, sempre em segundos de 120 bpm. Mexeu num, confere o outro.
