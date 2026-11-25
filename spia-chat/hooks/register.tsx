import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Conteggi, Dove } from '../types'


const percentuale = atom({ plugin: 'spia-chat', key: 'percentuale' } as const, 0)
const conteggi = atom({ plugin: 'spia-chat', key: 'conteggi' } as const, {
  turni: 0,
  operazioniCodice: 0,
  letturaDocumenti: 0,
  incollaLunghi: 0,
} as Conteggi)
const nascostoPieno = atom({ plugin: 'spia-chat', key: 'nascostoPieno' } as const, 0)
const nascostoConsiglio = atom({ plugin: 'spia-chat', key: 'nascostoConsiglio' } as const, null as Dove | null)

// Soglie di riempimento del contesto.
const ATTENZIONE = 60
const PIENO = 80

const STRUMENTI_CODICE = new Set(['Edit', 'Write', 'NotebookEdit', 'Bash', 'Grep', 'Glob'])
const DOCUMENTO = /\.(pdf|docx?|pptx?|xlsx?|csv|md|txt|rtf|odt)$/i
const CODICE = /\.(ts|tsx|js|jsx|py|java|kt|swift|go|rs|rb|php|c|cc|cpp|h|cs|html|css|scss|json|ya?ml|toml|sql|sh)$/i

const livello = (p: number) => (p >= PIENO ? 2 : p >= ATTENZIONE ? 1 : 0)

/** Dove conviene lavorare, in base a cosa è successo finora nella sessione. */
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

const coloreLivello = (p: number) => (p >= PIENO ? '#e5484d' : p >= ATTENZIONE ? '#f5a524' : '#3fb37f')

/* ---------- Animazione 1: la nuvoletta della chat che si riempie ---------- */
function svgPieno(p: number): string {
  const c = coloreLivello(p)
  const pieno = Math.min(100, Math.max(0, p))
  // Interno della nuvoletta: da y=6 a y=40, alto 34.
  const y = 40 - (34 * pieno) / 100
  const trabocca = p >= PIENO
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
<defs><clipPath id="dentro"><path d="M10 6h52a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6H30l-12 10v-10h-8a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z"/></clipPath></defs>
<g class="scuoti">
${trabocca ? `<path class="alone" d="M10 6h52a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6H30l-12 10v-10h-8a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z" fill="none" stroke="${c}" stroke-width="6"/>` : ''}
<g clip-path="url(#dentro)">
<g class="onda"><path d="M0 ${y} q6 -3 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 V60 H0z" fill="${c}" opacity=".85"/></g>
</g>
<path d="M10 6h52a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6H30l-12 10v-10h-8a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z" fill="none" stroke="${c}" stroke-width="2.5"/>
</g>
${trabocca ? `<circle class="bolla" cx="26" cy="8" r="2.5" fill="${c}"/><circle class="bolla b2" cx="40" cy="8" r="3" fill="${c}"/><circle class="bolla b3" cx="54" cy="8" r="2" fill="${c}"/>` : ''}
<text x="36" y="28" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#ffffff" stroke="#00000055" stroke-width=".6">${Math.round(p)}%</text>
</svg>`
}

/* ---------- Animazione 2: la freccia che indica dove spostarsi ---------- */
function svgConsiglio(dove: Dove): string {
  const xs: Record<Dove, number> = { chat: 20, progetto: 70, code: 120 }
  const tx = xs[dove]
  const colore = '#7c6cf0'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 56" width="140" height="56">
<style>
.icona{fill:none;stroke:#8a8f98;stroke-width:2}
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
<g font-family="sans-serif" font-size="9" text-anchor="middle" fill="#8a8f98">
<text x="20" y="54">Chat</text><text x="70" y="54">Progetto</text><text x="120" y="54">Code</text>
</g>
</svg>`
}

/* ---------- Sfondo del tema: un tubo sul bordo destro che si riempie ---------- */
function svgSfondo(p: number): string {
  const c = coloreLivello(p)
  const altezza = (600 * Math.min(100, p)) / 100
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
<style>
.liquido{animation:respira 6s ease-in-out infinite}
@keyframes respira{0%,100%{opacity:.18}50%{opacity:${p >= PIENO ? '.38' : '.24'}}}
.onda{animation:scorri 5s linear infinite}
@keyframes scorri{from{transform:translateX(0)}to{transform:translateX(-40px)}}
@media (prefers-reduced-motion: reduce){.liquido,.onda{animation:none}}
</style>
<svg x="0" y="0" width="1000" height="1000" viewBox="0 0 100 1000" preserveAspectRatio="xMaxYMid meet">
<defs><clipPath id="tubo"><rect x="78" y="200" width="14" height="600" rx="7"/></clipPath></defs>
<rect x="78" y="200" width="14" height="600" rx="7" fill="none" stroke="${c}" stroke-opacity=".25" stroke-width="1.5"/>
<g clip-path="url(#tubo)" class="liquido">
<g class="onda"><path d="M60 ${800 - altezza} q5 -4 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 V820 H60z" fill="${c}"/></g>
</g>
</svg>
</svg>`
}

const barraTesto = (p: number) => {
  const pieni = Math.round(Math.min(100, p) / 10)
  return '█'.repeat(pieni) + '░'.repeat(10 - pieni)
}

async function aggiornaPercentuale($: EngineInterface) {
  const { context } = await $.session.usage()
  const p = Math.round(context.percent ?? 0)
  const prima = await read($, percentuale)
  await update($, percentuale, () => p)
  if (livello(p) > livello(prima)) {
    $.ui.toast(
      p >= PIENO
        ? `Chat piena al ${p}%: conviene aprirne una nuova (/clear) o compattarla.`
        : `Chat al ${p}%: inizia a pensare a una nuova conversazione.`,
    )
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'dove',
      description: 'Mostra quanto è piena la chat e dove conviene lavorare (Chat, Progetto o Code)',
    })
    try {
      await $.theme.set({ backdrop: { scene: 'tubo-contesto', glass: false } })
    } catch {
      // Una superficie che non disegna temi: restano le animazioni sopra il prompt.
    }
    await aggiornaPercentuale($)
    return next(e)
  })

  on('command.run', { command: 'dove' }, async $ => {
    await aggiornaPercentuale($)
    const p = await read($, percentuale)
    const d = consiglio(await read($, conteggi)) ?? 'code'
    await update($, nascostoPieno, () => 0)
    await update($, nascostoConsiglio, () => null)
    return { text: `Contesto usato: ${p}% ${barraTesto(p)}\n${TESTO_CONSIGLIO[d]}` }
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
      $.ui.toast(dopo === 'chat' ? 'Suggerimento: questa conversazione starebbe bene in una chat normale.' : 'Suggerimento: per questi documenti conviene un Progetto.')
    }
    await aggiornaPercentuale($)
    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.props.scene !== 'tubo-contesto' || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const p = await read($, percentuale)
    const { Svg } = $.ui.resolve(e)
    return <Svg source={svgSfondo(p)} alt={`Contesto della chat usato al ${p}%`} isInteractive />
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const p = await read($, percentuale)
    const d = consiglio(await read($, conteggi))
    const mostraPieno = livello(p) > 0 && livello(p) > (await read($, nascostoPieno))
    const mostraConsiglio = d !== null && d !== 'code' && d !== (await read($, nascostoConsiglio))
    if (!mostraPieno && !mostraConsiglio) return next(e)

    const elementi = $.ui.resolve(e)
    const { Box, Text, Button } = elementi
    const Svg = 'Svg' in elementi ? elementi.Svg : null
    const grafica = Svg !== null && (e.surface === 'desktop' || e.surface === 'mobile')

    return (
      <Box flexDirection="column">
        {mostraPieno ? (
          <Box flexDirection="row" alignItems="center" gap={1}>
            {grafica && Svg ? (
              <Svg source={svgPieno(p)} alt={`Chat piena al ${p}%`} width={72} height={56} isInteractive />
            ) : (
              <Text color={coloreLivello(p)}>{barraTesto(p)} {p}%</Text>
            )}
            <Text bold={p >= PIENO}>
              {p >= PIENO
                ? 'La chat è quasi piena: apri una nuova conversazione (/clear) o compattala. '
                : 'La chat si sta riempiendo: tra poco conviene ripartire da una nuova. '}
            </Text>
            <Button key="compatta" label="Compatta ora" onPress={() => void $.session.compact()} />
            <Button key="ok-pieno" label="Ok" onPress={() => update($, nascostoPieno, () => livello(p))} />
          </Box>
        ) : null}
        {mostraConsiglio && d !== null ? (
          <Box flexDirection="row" alignItems="center" gap={1}>
            {grafica && Svg ? (
              <Svg source={svgConsiglio(d)} alt={`Consiglio: passa a ${d === 'chat' ? 'una chat normale' : 'un progetto'}`} width={140} height={56} isInteractive />
            ) : (
              <Text color="#7c6cf0">Code → {d === 'chat' ? 'Chat' : 'Progetto'}</Text>
            )}
            <Text>{TESTO_CONSIGLIO[d]} </Text>
            <Button key="ok-consiglio" label="Ok" onPress={() => update($, nascostoConsiglio, () => d)} />
          </Box>
        ) : null}
      </Box>
    )
  })
}
