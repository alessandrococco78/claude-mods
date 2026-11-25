import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import type { Conteggi, Dove, Limiti } from '../types'
import { makeColors } from './make-colors.js'

/* ================= Stato ================= */

const percentuale = atom({ plugin: 'spia-chat', key: 'percentuale' } as const, 0)
const conteggi = atom({ plugin: 'spia-chat', key: 'conteggi' } as const, {
  turni: 0,
  operazioniCodice: 0,
  letturaDocumenti: 0,
  incollaLunghi: 0,
} as Conteggi)
const limiti = atom({ plugin: 'spia-chat', key: 'limiti' } as const, {
  cinqueOre: null,
  settimana: null,
  resetCinqueOre: null,
  resetSettimana: null,
} as Limiti)
const nascostoPieno = atom({ plugin: 'spia-chat', key: 'nascostoPieno' } as const, 0)
const nascostoConsiglio = atom({ plugin: 'spia-chat', key: 'nascostoConsiglio' } as const, null as Dove | null)

/* ================= Soglie ================= */

const ATTENZIONE = 60
const PIENO = 80
const LIMITE_ATTENZIONE = 70
const LIMITE_CRITICO = 90

const livello = (p: number) => (p >= PIENO ? 2 : p >= ATTENZIONE ? 1 : 0)
const livelloLimite = (p: number | null) =>
  p === null ? 0 : p >= LIMITE_CRITICO ? 2 : p >= LIMITE_ATTENZIONE ? 1 : 0

/* ================= Colori: crema caldo di giorno, marrone di notte ================= */

const { theme: colori, problems: problemiColori } = makeColors({
  label: 'Spia chat crema',
  roles: { accent: '#b5652e', danger: '#b3392f', success: '#5a7d3a', warning: '#a8721a', pro: '#7a5a94' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#e3d7bf',
        'surface-1': '#eae0cb',
        'surface-2': '#efe6d4',
        'text-primary': '#2b241b',
        'text-secondary': '#51473a',
        'text-muted': '#665a4a',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#211b15',
        'surface-1': '#29221b',
        'surface-2': '#302820',
        'surface-3': '#372e25',
        'text-primary': '#efe5d4',
        'text-secondary': '#cdc1ae',
        'text-muted': '#aa9d89',
      },
    },
  },
})

const TEMA: ThemeSetArgs = { colors: colori, backdrop: { scene: 'cielo-contesto' } }

/* ================= Dove conviene lavorare ================= */

const STRUMENTI_CODICE = new Set(['Edit', 'Write', 'NotebookEdit', 'Bash', 'Grep', 'Glob'])
const DOCUMENTO = /\.(pdf|docx?|pptx?|xlsx?|csv|md|txt|rtf|odt)$/i
const CODICE = /\.(ts|tsx|js|jsx|py|java|kt|swift|go|rs|rb|php|c|cc|cpp|h|cs|html|css|scss|json|ya?ml|toml|sql|sh)$/i

function consiglio(c: Conteggi): Dove | null {
  if (c.turni < 3) return null
  const documenti = c.letturaDocumenti + c.incollaLunghi
  if (c.operazioniCodice === 0 && documenti < 2) return 'chat'
  if (documenti >= 3 && c.operazioniCodice < documenti) return 'progetto'
  return 'code'
}

const TESTO_CONSIGLIO: Record<Dove, string> = {
  chat: 'Qui non stai toccando codice né file: una chat normale su claude.ai basta ed è più leggera.',
  progetto:
    'Stai lavorando soprattutto su documenti: un Progetto su claude.ai li tiene come conoscenza fissa, senza ricaricarli ogni volta.',
  code: 'Stai lavorando su codice e file: Claude Code è il posto giusto.',
}

const PROMPT_RIASSUNTO =
  'Fammi un riassunto di tutto quello che abbiamo fatto in questa conversazione, da incollare in una chat nuova per ripartire da qui. ' +
  'Mettilo in un unico blocco di testo da copiare, con: obiettivo, cosa è stato fatto, decisioni prese, file toccati, cosa resta da fare e il prossimo passo.'

/* ================= Utilità ================= */

const coloreLivello = (p: number) => (p >= PIENO ? '#c2453b' : p >= ATTENZIONE ? '#d08a2a' : '#5f8f4e')

const barraTesto = (p: number) => {
  const pieni = Math.round(Math.min(100, Math.max(0, p)) / 10)
  return '█'.repeat(pieni) + '░'.repeat(10 - pieni)
}

function ora(iso: string | null): string {
  if (iso === null) return ''
  try {
    const d = new Date(iso)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const oggi = new Date()
    if (d.toDateString() === oggi.toDateString()) return `alle ${hh}:${mm}`
    const giorni = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
    return `${giorni[d.getDay()]} ${hh}:${mm}`
  } catch {
    return ''
  }
}

const mescola = (a: string, b: string, t: number) => {
  const x = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16)
  const k = Math.min(1, Math.max(0, t))
  return (
    '#' +
    [0, 1, 2]
      .map(i => Math.round(x(a, i) + (x(b, i) - x(a, i)) * k).toString(16).padStart(2, '0'))
      .join('')
  )
}

/* ================= Animazione 1: la nuvoletta che si riempie ================= */

function svgPieno(p: number): string {
  const c = coloreLivello(p)
  const pieno = Math.min(100, Math.max(0, p))
  const y = 40 - (34 * pieno) / 100
  const trabocca = p >= PIENO
  const bolla = 'M10 6h52a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6H30l-12 10v-10h-8a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 56" width="72" height="56">
<style>
.onda{animation:onda 2.4s linear infinite}
@keyframes onda{from{transform:translateX(0)}to{transform:translateX(-24px)}}
.bolla{animation:sale 2.6s ease-in infinite;opacity:0}
.b2{animation-delay:.9s}.b3{animation-delay:1.7s}
@keyframes sale{0%{transform:translateY(0);opacity:0}20%{opacity:.9}100%{transform:translateY(-22px);opacity:0}}
.scuoti{transform-origin:36px 28px;animation:${trabocca ? 'scuoti 3s ease-in-out infinite' : 'none'}}
@keyframes scuoti{0%,80%,100%{transform:rotate(0)}85%{transform:rotate(-4deg)}90%{transform:rotate(4deg)}95%{transform:rotate(-2deg)}}
.alone{animation:alone 3s ease-in-out infinite}
@keyframes alone{0%,100%{opacity:.15}50%{opacity:.45}}
@media (prefers-reduced-motion: reduce){.onda,.bolla,.scuoti,.alone{animation:none}.bolla{opacity:.8}}
</style>
<defs><clipPath id="dentro"><path d="${bolla}"/></clipPath></defs>
<g class="scuoti">
${trabocca ? `<path class="alone" d="${bolla}" fill="none" stroke="${c}" stroke-width="6"/>` : ''}
<g clip-path="url(#dentro)">
<g class="onda"><path d="M0 ${y} q6 -3 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 V60 H0z" fill="${c}" opacity=".85"/></g>
</g>
<path d="${bolla}" fill="none" stroke="${c}" stroke-width="2.5"/>
</g>
${trabocca ? `<circle class="bolla" cx="26" cy="8" r="2.5" fill="${c}"/><circle class="bolla b2" cx="40" cy="8" r="3" fill="${c}"/><circle class="bolla b3" cx="54" cy="8" r="2" fill="${c}"/>` : ''}
<text x="36" y="28" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#ffffff" stroke="#00000055" stroke-width=".6">${Math.round(p)}%</text>
</svg>`
}

/* ================= Barrette sempre visibili: chat e limiti ================= */

function svgBarretta(etichetta: string, p: number | null, colore: string): string {
  const v = p === null ? 0 : Math.min(100, Math.max(0, p))
  const w = (96 * v) / 100
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 22" width="150" height="22">
<style>
.riempi{animation:cresce 1.2s ease-out both;transform-origin:44px 11px}
@keyframes cresce{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.luce{animation:luce 4s ease-in-out infinite}
@keyframes luce{0%,100%{opacity:0}50%{opacity:.35}}
@media (prefers-reduced-motion: reduce){.riempi,.luce{animation:none}}
</style>
<text x="0" y="15" font-family="sans-serif" font-size="11" fill="#8a7d69">${etichetta}</text>
<rect x="44" y="5" width="96" height="12" rx="6" fill="#8a7d6933"/>
<rect class="riempi" x="44" y="5" width="${w}" height="12" rx="6" fill="${colore}"/>
<rect class="luce" x="44" y="5" width="${w}" height="12" rx="6" fill="#ffffff"/>
<text x="92" y="15" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="700" fill="#2b241b">${p === null ? '–' : Math.round(v) + '%'}</text>
</svg>`
}

const coloreLimite = (p: number | null) =>
  p === null ? '#8a7d69' : p >= LIMITE_CRITICO ? '#c2453b' : p >= LIMITE_ATTENZIONE ? '#d08a2a' : '#5f8f4e'

/* ================= Animazione 2: dove spostarsi ================= */

function svgConsiglio(dove: Dove): string {
  const xs: Record<Dove, number> = { chat: 20, progetto: 70, code: 120 }
  const tx = xs[dove]
  const colore = '#b5652e'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 56" width="140" height="56">
<style>
.icona{fill:none;stroke:#8a7d69;stroke-width:2}
.meta .icona{stroke:${colore}}
.meta{transform-origin:${tx}px 22px;animation:pulsa 2.4s ease-in-out infinite}
@keyframes pulsa{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
.freccia{animation:vai 2.4s ease-in-out infinite}
@keyframes vai{0%{transform:translateX(${120 - tx}px);opacity:0}25%{opacity:1}75%{opacity:1}100%{transform:translateX(0);opacity:0}}
.alone{animation:alone 2.4s ease-in-out infinite}
@keyframes alone{0%,100%{opacity:.1}50%{opacity:.35}}
@media (prefers-reduced-motion: reduce){.meta,.freccia,.alone{animation:none}}
</style>
<circle class="alone" cx="${tx}" cy="22" r="17" fill="${colore}"/>
<g${dove === 'chat' ? ' class="meta"' : ''}><path class="icona" d="M10 13h20a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H19l-6 5v-5h-3a3 3 0 0 1-3-3V16a3 3 0 0 1 3-3z"/></g>
<g${dove === 'progetto' ? ' class="meta"' : ''}><path class="icona" d="M57 15h9l3 3h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H57a2 2 0 0 1-2-2V17a2 2 0 0 1 2-2z"/></g>
<g${dove === 'code' ? ' class="meta"' : ''}><rect class="icona" x="106" y="13" width="28" height="19" rx="3"/><path class="icona" d="M111 19l4 3l-4 3M118 26h6"/></g>
${dove === 'code' ? '' : `<g class="freccia"><path d="M${tx - 4} 46h8M${tx + 1} 43l4 3l-4 3" stroke="${colore}" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>`}
<g font-family="sans-serif" font-size="9" text-anchor="middle" fill="#8a7d69">
<text x="20" y="54">Chat</text><text x="70" y="54">Progetto</text><text x="120" y="54">Code</text>
</g>
</svg>`
}

/* ================= Sfondo: il cielo si annuvola man mano che la chat si riempie ================= */

function nuvola(x: number, y: number, s: number, colore: string, opacita: number, classe: string): string {
  return `<g class="${classe}" opacity="${opacita.toFixed(2)}"><g transform="translate(${x} ${y}) scale(${s})" fill="${colore}">
<ellipse cx="0" cy="0" rx="90" ry="34"/><ellipse cx="-50" cy="8" rx="60" ry="28"/><ellipse cx="55" cy="6" rx="65" ry="30"/><ellipse cx="10" cy="-26" rx="58" ry="36"/>
</g></g>`
}

function svgCielo(p: number): string {
  const t = Math.min(100, Math.max(0, p)) / 100
  // Cielo chiaro (crema e azzurro) e scuro (notte marrone), dal sereno al temporale.
  const altoChiaro = mescola('#b9d3e0', '#5f6670', t)
  const bassoChiaro = mescola('#ece1c8', '#a39a8c', t)
  const altoScuro = mescola('#1d2a38', '#121417', t)
  const bassoScuro = mescola('#2b2219', '#1b1a19', t)
  const nuvolaChiara = mescola('#fbf6ea', '#6d6f74', t)
  const nuvolaScura = mescola('#4a4036', '#2a2b2e', t)
  const sole = Math.max(0, 1 - t * 1.6)
  const nuvole = (
    [
    [220, 170, 1.0, 0.0],
    [1300, 140, 1.2, 0.15],
    [700, 110, 0.8, 0.3],
    [1500, 330, 0.9, 0.45],
    [100, 360, 1.1, 0.55],
    [950, 250, 1.4, 0.65],
    [450, 230, 1.3, 0.75],
    [1150, 380, 1.5, 0.85],
    ] as [number, number, number, number][]
  )
    .map(([x, y, s, soglia], i) => {
      const o = Math.max(0, Math.min(1, (t - soglia) * 4 + 0.1)) * (t > soglia - 0.02 ? 1 : 0)
      return o > 0 ? nuvola(x, y, s, 'var(--nuvola)', 0.35 + 0.55 * o, `deriva d${i % 4}`) : ''
    })
    .join('')
  const pioggia =
    t >= PIENO / 100
      ? `<g class="pioggia" stroke="var(--pioggia)" stroke-width="2" stroke-linecap="round">${Array.from({ length: 70 }, (_, i) => {
          const x = (i * 97) % 1600
          const y = ((i * 53) % 900) - 100
          return `<path d="M${x} ${y}l-10 34"/>`
        }).join('')}</g>`
      : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<style>
:root{--alto:${altoChiaro};--basso:${bassoChiaro};--nuvola:${nuvolaChiara};--pioggia:#5d6a78;--sole:#f2c46d}
@media (prefers-color-scheme: dark){:root{--alto:${altoScuro};--basso:${bassoScuro};--nuvola:${nuvolaScura};--pioggia:#7d8a98;--sole:#d9b77a}}
.deriva{animation:deriva 90s ease-in-out infinite alternate}
.d1{animation-duration:120s}.d2{animation-duration:75s;animation-direction:alternate-reverse}.d3{animation-duration:140s}
@keyframes deriva{from{transform:translateX(-60px)}to{transform:translateX(60px)}}
.raggi{transform-origin:180px 160px;animation:gira 80s linear infinite}
@keyframes gira{to{transform:rotate(360deg)}}
.pioggia{opacity:.22;animation:cade 2.8s linear infinite}
@keyframes cade{from{transform:translate(0,-120px)}to{transform:translate(-36px,0)}}
@media (prefers-reduced-motion: reduce){.deriva,.raggi,.pioggia{animation:none}}
</style>
<defs><linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--alto)"/><stop offset="1" style="stop-color:var(--basso)"/></linearGradient></defs>
<rect width="1600" height="1000" fill="url(#cielo)"/>
<g opacity="${sole.toFixed(2)}">
<g class="raggi" stroke="var(--sole)" stroke-width="6" stroke-linecap="round" opacity=".5">
${Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6
  return `<path d="M${(180 + Math.cos(a) * 90).toFixed(0)} ${(160 + Math.sin(a) * 90).toFixed(0)}L${(180 + Math.cos(a) * 125).toFixed(0)} ${(160 + Math.sin(a) * 125).toFixed(0)}"/>`
}).join('')}
</g>
<circle cx="180" cy="160" r="64" fill="var(--sole)"/>
</g>
${nuvole}
${pioggia}
</svg>`
}

/* ================= Lettura dei dati ================= */

async function aggiorna($: EngineInterface) {
  const { context, rateLimits } = await $.session.usage()
  const p = Math.round(context.percent ?? 0)
  const prima = await read($, percentuale)
  await update($, percentuale, () => p)
  if (livello(p) > livello(prima)) {
    $.ui.toast(
      p >= PIENO
        ? `Chat piena al ${p}%: premi «Riassunto per nuova chat» e riparti da una conversazione nuova.`
        : `Chat al ${p}%: inizia a pensare a una nuova conversazione.`,
    )
  }

  const cinque = rateLimits.find(r => r.kind === 'five_hour')
  const sette = rateLimits.find(r => r.kind === 'seven_day')
  const vecchi = await read($, limiti)
  const nuovi: Limiti = {
    cinqueOre: cinque ? cinque.percentUsed : vecchi.cinqueOre,
    settimana: sette ? sette.percentUsed : vecchi.settimana,
    resetCinqueOre: cinque?.resetsAt ?? vecchi.resetCinqueOre,
    resetSettimana: sette?.resetsAt ?? vecchi.resetSettimana,
  }
  await update($, limiti, () => nuovi)
  if (livelloLimite(nuovi.cinqueOre) > livelloLimite(vecchi.cinqueOre)) {
    $.ui.toast(
      `Limite delle 5 ore al ${Math.round(nuovi.cinqueOre ?? 0)}%: si azzera ${ora(nuovi.resetCinqueOre)}. Tieni le cose importanti per dopo.`,
    )
  }
  if (livelloLimite(nuovi.settimana) > livelloLimite(vecchi.settimana)) {
    $.ui.toast(`Limite settimanale al ${Math.round(nuovi.settimana ?? 0)}%: si azzera ${ora(nuovi.resetSettimana)}.`)
  }
}

function testoLimiti(l: Limiti): string {
  const parti: string[] = []
  if (l.cinqueOre !== null) parti.push(`5 ore ${Math.round(l.cinqueOre)}% (si azzera ${ora(l.resetCinqueOre)})`)
  if (l.settimana !== null) parti.push(`settimana ${Math.round(l.settimana)}% (si azzera ${ora(l.resetSettimana)})`)
  return parti.length > 0 ? `Limiti Pro: ${parti.join(' · ')}` : 'Limiti Pro: compaiono dopo la prima risposta'
}

/* ================= Hook ================= */

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'dove',
      description: 'Mostra quanto è piena la chat, i limiti del piano e dove conviene lavorare',
    })
    await $.command.register({
      name: 'riassunto',
      description: 'Chiede a Claude un riassunto da incollare in una chat nuova',
    })
    const bloccante = problemiColori.find(line => line.startsWith("Desktop won't paint"))
    if (bloccante !== undefined) $.ui.log(`spia-chat: ${bloccante}`)
    try {
      await $.theme.set(TEMA)
    } catch {
      // Una superficie che non disegna temi: restano le barre sopra il prompt.
    }
    await aggiorna($)
    return next(e)
  })

  on('command.run', { command: 'dove' }, async $ => {
    await aggiorna($)
    const p = await read($, percentuale)
    const d = consiglio(await read($, conteggi)) ?? 'code'
    await update($, nascostoPieno, () => 0)
    await update($, nascostoConsiglio, () => null)
    return {
      text: `Chat: ${p}% ${barraTesto(p)}\n${testoLimiti(await read($, limiti))}\n${TESTO_CONSIGLIO[d]}`,
    }
  })

  on('command.run', { command: 'riassunto' }, async $ => {
    void $.prompt.submit({ text: PROMPT_RIASSUNTO, asUser: true })
    return { text: 'Chiedo il riassunto: copialo, apri una nuova sessione e incollalo come primo messaggio.' }
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.text.length > 2000) {
      await update($, conteggi, c => ({ ...c, incollaLunghi: c.incollaLunghi + 1 }))
    }
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const fp = (e as { file_path?: unknown }).file_path
    const percorso = typeof fp === 'string' ? fp : ''
    if (STRUMENTI_CODICE.has(e.tool) || (e.tool === 'Read' && CODICE.test(percorso))) {
      await update($, conteggi, c => ({ ...c, operazioniCodice: c.operazioniCodice + 1 }))
    } else if (
      (e.tool === 'Read' && DOCUMENTO.test(percorso)) ||
      e.tool === 'WebFetch' ||
      e.tool === 'WebSearch'
    ) {
      await update($, conteggi, c => ({ ...c, letturaDocumenti: c.letturaDocumenti + 1 }))
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const prima = consiglio(await read($, conteggi))
    await update($, conteggi, c => ({ ...c, turni: c.turni + 1 }))
    const dopo = consiglio(await read($, conteggi))
    if (dopo !== null && dopo !== 'code' && dopo !== prima) {
      $.ui.toast(
        dopo === 'chat'
          ? 'Suggerimento: questa conversazione starebbe bene in una chat normale.'
          : 'Suggerimento: per questi documenti conviene un Progetto.',
      )
    }
    await aggiorna($)
    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.props.scene !== 'cielo-contesto' || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const p = await read($, percentuale)
    const { Svg } = $.ui.resolve(e)
    const meteo = p >= PIENO ? 'temporale' : p >= ATTENZIONE ? 'nuvoloso' : p >= 30 ? 'qualche nuvola' : 'sereno'
    return <Svg source={svgCielo(p)} alt={`Cielo ${meteo}: chat usata al ${p}%`} isInteractive />
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const p = await read($, percentuale)
    const l = await read($, limiti)
    const d = consiglio(await read($, conteggi))
    const grande = livello(p) > 0 && livello(p) > (await read($, nascostoPieno))
    const mostraConsiglio = d !== null && d !== 'code' && d !== (await read($, nascostoConsiglio))

    const elementi = $.ui.resolve(e)
    const { Box, Text, Button } = elementi
    const Svg = 'Svg' in elementi ? elementi.Svg : null
    const grafica = Svg !== null && (e.surface === 'desktop' || e.surface === 'mobile')

    const riassunto = (
      <Button
        key="riassunto"
        label="Riassunto per nuova chat"
        onPress={() => void $.prompt.submit({ text: PROMPT_RIASSUNTO, asUser: true })}
      />
    )

    return (
      <Box flexDirection="column">
        {/* Riga sempre visibile: chat e limiti del piano */}
        <Box flexDirection="row" alignItems="center" gap={1} flexWrap="wrap">
          {grafica && Svg ? (
            <Box flexDirection="row" alignItems="center" gap={1}>
              <Svg source={svgBarretta('Chat', p, coloreLivello(p))} alt={`Chat usata al ${p}%`} width={150} height={22} isInteractive />
              <Svg source={svgBarretta('5 ore', l.cinqueOre, coloreLimite(l.cinqueOre))} alt={`Limite 5 ore al ${l.cinqueOre ?? 0}%`} width={150} height={22} isInteractive />
              <Svg source={svgBarretta('Settim.', l.settimana, coloreLimite(l.settimana))} alt={`Limite settimanale al ${l.settimana ?? 0}%`} width={150} height={22} isInteractive />
            </Box>
          ) : (
            <Text>
              <Text color={coloreLivello(p)}>Chat {barraTesto(p)} {p}%</Text>
              <Text dimColor>
                {'  '}5 ore {l.cinqueOre === null ? '–' : `${Math.round(l.cinqueOre)}%`} · settimana{' '}
                {l.settimana === null ? '–' : `${Math.round(l.settimana)}%`}
              </Text>
            </Text>
          )}
          {l.cinqueOre !== null && l.cinqueOre >= LIMITE_ATTENZIONE ? (
            <Text dimColor>si azzera {ora(l.resetCinqueOre)}</Text>
          ) : null}
          {!grande && p >= 40 ? riassunto : null}
        </Box>

        {/* Avviso grande dal 60% */}
        {grande ? (
          <Box flexDirection="row" alignItems="center" gap={1} flexWrap="wrap">
            {grafica && Svg ? (
              <Svg source={svgPieno(p)} alt={`Chat piena al ${p}%`} width={72} height={56} isInteractive />
            ) : null}
            <Text bold={p >= PIENO}>
              {p >= PIENO
                ? 'La chat è quasi piena: fatti dare il riassunto e riparti da una nuova conversazione. '
                : 'La chat si sta riempiendo: tra poco conviene ripartire da una nuova. '}
            </Text>
            {riassunto}
            <Button key="compatta" label="Compatta ora" onPress={() => void $.session.compact()} />
            <Button key="ok-pieno" label="Ok" onPress={() => update($, nascostoPieno, () => livello(p))} />
          </Box>
        ) : null}

        {/* Dove conviene lavorare */}
        {mostraConsiglio && d !== null ? (
          <Box flexDirection="row" alignItems="center" gap={1} flexWrap="wrap">
            {grafica && Svg ? (
              <Svg
                source={svgConsiglio(d)}
                alt={`Consiglio: passa a ${d === 'chat' ? 'una chat normale' : 'un progetto'}`}
                width={140}
                height={56}
                isInteractive
              />
            ) : (
              <Text color="#b5652e">Code → {d === 'chat' ? 'Chat' : 'Progetto'}</Text>
            )}
            <Text>{TESTO_CONSIGLIO[d]} </Text>
            <Button key="ok-consiglio" label="Ok" onPress={() => update($, nascostoConsiglio, () => d)} />
          </Box>
        ) : null}
      </Box>
    )
  })
}
