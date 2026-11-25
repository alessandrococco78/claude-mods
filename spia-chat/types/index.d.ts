export type Dove = 'code' | 'chat' | 'progetto'

export type Conteggi = {
  turni: number
  operazioniCodice: number
  letturaDocumenti: number
  incollaLunghi: number
}

declare module 'claude-code' {
  interface PluginState {
    'spia-chat': {
      percentuale: number
      conteggi: Conteggi
      nascostoPieno: number
      nascostoConsiglio: Dove | null
    }
  }
}
