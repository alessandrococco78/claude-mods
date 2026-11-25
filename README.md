# claude-mods

I miei mod per Claude Code.

## spia-chat

Mostra sopra il campo di testo un'animazione quando la chat si sta riempiendo:
una nuvoletta che si riempie (arancione dal 60% di contesto usato, rossa e
tremante dall'80%), con il pulsante **Compatta ora** e il consiglio di aprire una
nuova conversazione. Come sfondo del tema, un tubo sul bordo destro si riempie
insieme al contesto.

Dopo qualche messaggio suggerisce, con una freccia animata, se conviene passare
a una **chat normale** (nessun lavoro su codice o file), a un **Progetto**
(soprattutto documenti) o restare su **Claude Code**.

Il comando `/dove` mostra in ogni momento la percentuale di contesto usato e il consiglio.
Le animazioni compaiono nell'app desktop e su mobile; nel terminale si vede una barra di testo.

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
