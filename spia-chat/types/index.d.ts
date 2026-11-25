export type Dove = 'code' | 'chat' | 'progetto'

export type Conteggi = {
  turni: number
  operazioniCodice: number
  letturaDocumenti: number
  incollaLunghi: number
}

/** I limiti del piano (finestra di 5 ore e settimanale), in percentuale usata. */
export type Limiti = {
  cinqueOre: number | null
  settimana: number | null
  resetCinqueOre: string | null
  resetSettimana: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'spia-chat': {
      percentuale: number
      conteggi: Conteggi
      limiti: Limiti
      nascostoPieno: number
      nascostoConsiglio: Dove | null
    }
  }
}
