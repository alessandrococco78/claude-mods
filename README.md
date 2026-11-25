# claude-mods

I miei mod per Claude Code.

## spia-chat

Un tema per la scheda **Code** dell'app Claude che tiene d'occhio la conversazione.

- **Sempre visibile, dallo 0%:** sopra il campo di testo tre barrette animate: quanto è piena la
  **chat**, il **limite delle 5 ore** e il **limite settimanale** del piano Pro, con l'ora in cui si azzerano.
- **Dal 60%** compare la nuvoletta che si riempie (arancione), **dall'80%** diventa rossa e trema.
- **Pulsante «Riassunto per nuova chat»:** Claude prepara un riassunto da incollare in una
  conversazione nuova, per ripartire leggeri. Lo stesso con il comando `/riassunto`.
- **Sfondo che cambia col contesto:** un cielo sereno col sole che man mano si annuvola,
  fino al temporale con la pioggia quando la chat è quasi piena.
- **Colori crema caldo** di giorno e **marrone scuro** di notte.
- **Dove conviene lavorare:** dopo qualche messaggio una freccia animata suggerisce se passare a
  una **chat normale** o a un **Progetto**, oppure restare su **Claude Code**.
- `/dove` riassume tutto in qualsiasi momento.

Nel terminale le animazioni diventano barre di testo.

### Aggiornare all'ultima versione

Da PowerShell (o da un terminale):

```bash
claude plugin marketplace update claude-mods
```

```bash
claude plugin update spia-chat@claude-mods
```

poi chiudi e riapri Claude Code (o l'app).

## Installazione

Al prompt di una sessione di Claude Code nel terminale:

```
/plugin install spia-chat --marketplace alessandrococco78/claude-mods
```

Da una shell:

```bash
claude plugin install spia-chat --marketplace alessandrococco78/claude-mods
```

Nell'app desktop: clicca **+** accanto al campo di testo, poi **Plugins**, **Add marketplace**
con `alessandrococco78/claude-mods`, poi **Add plugin**.

Il repository è privato: per installarlo, git sul tuo computer deve già avere accesso
a GitHub (chiave SSH, oppure `gh auth login` e poi `gh auth setup-git`).
