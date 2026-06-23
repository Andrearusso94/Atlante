// Dataset curato della Peste Nera — Nord/Centro Europa.
// PORTATO LETTERALMENTE dal v12 (atlante-generatore-ia-v12.html), nessun testo modificato.
// Golden principle: i confini reali del 1300 vengono da historical-basemaps;
// 'name' deve combaciare col campo NAME del dataset. I testi sono curati e segnalano stime/tradizioni.

import type { PlagueRegion, QuizItem } from "../types/peste";

export const PESTE: PlagueRegion[] = [
  {name:"English territory",label:"Inghilterra",ll:[52.19,-2.19],slides:[
    {scene:"route",tag:"L'arrivo · estate 1348",text:"<b>Inghilterra.</b> La peste sbarca dalla Guascogna: i cronisti la collocano a Melcombe Regis, nel Dorset, intorno al giugno 1348. Da lì risale verso l'interno seguendo strade e fiumi."},
    {scene:"city",tag:"Londra · autunno 1348",text:"In pochi mesi raggiunge Londra. Si scavano fosse comuni a East Smithfield; l'inverno non ferma il contagio, che dilaga per tutto il 1349."},
    {scene:"macabre",tag:"La «Grande Pestilenza»",text:"Le stime moderne indicano un calo della popolazione tra il 40% e il 60% in molte contee. Interi villaggi restano deserti e scompaiono dalle mappe."},
    {scene:"scroll",tag:"Dopo la peste · i salari",text:"La carenza di braccia fa salire i salari. La corona reagisce con l'Ordinance del 1349 e lo Statute of Labourers del 1351 per bloccarli, alimentando tensioni che esploderanno nella rivolta del 1381."}]},
  {name:"Scotland",label:"Scozia",ll:[56.55,-4.14],slides:[
    {scene:"route",tag:"1350 · dal sud",text:"<b>Scozia.</b> Raggiunta nel 1350, dopo l'Inghilterra. La diffusione segue le Lowlands e i centri abitati meridionali."},
    {scene:"macabre",tag:"«La morte immonda»",text:"I cronisti la chiamano «the foul death of the English». Secondo il racconto, un'armata radunata per attaccare l'Inghilterra colpita porta a casa il contagio."},
    {scene:"north",tag:"Le Highlands",text:"Le aree rurali e montuose, meno popolate e isolate, sembrano colpite più tardi e meno duramente rispetto alle città del sud."},
    {scene:"memorial",tag:"Il lutto",text:"Come ovunque, la mortalità travolge clero e comunità. La perdita di sacerdoti e amministratori disorganizza a lungo la vita religiosa e civile."}]},
  {name:"France",label:"Francia",ll:[46.71,1.95],slides:[
    {scene:"harbor",tag:"Marsiglia · gennaio 1348",text:"<b>Francia.</b> Dai porti del Mediterraneo la peste entra a Marsiglia nel gennaio 1348 e comincia a risalire la valle del Rodano."},
    {scene:"city",tag:"Avignone · sede papale",text:"Ad Avignone, sede dei papi, la mortalità è altissima. Clemente VI consacra il Rodano perché vi si possano gettare i corpi quando i cimiteri straboccano."},
    {scene:"macabre",tag:"Parigi · 1348–1349",text:"La peste raggiunge Parigi e il nord. Il medico papale Guy de Chauliac descrive con lucidità le due forme del morbo, bubbonica e polmonare."},
    {scene:"memorial",tag:"Contro i capri espiatori",text:"Clemente VI emette bolle che difendono gli ebrei dalle accuse di aver avvelenato i pozzi, tentando di frenare le persecuzioni che divampano altrove."}]},
  {name:"Holy Roman Empire",label:"Sacro Romano Impero",ll:[49.59,10.22],slides:[
    {scene:"route",tag:"1348–1349 · da sud e ovest",text:"<b>Sacro Romano Impero.</b> Il contagio penetra da più direzioni lungo le grandi vie fluviali e commerciali, raggiungendo le città renane e l'Europa centrale."},
    {scene:"flagellants",tag:"I flagellanti",text:"Si diffonde il movimento dei flagellanti: cortei di penitenti che si frustano in pubblico per placare l'ira divina. Clemente VI lo condanna nel 1349."},
    {scene:"memorial",tag:"Le persecuzioni · 1349",text:"Le comunità ebraiche vengono accusate di diffondere il morbo. Seguono massacri in molte città — tra cui Strasburgo, Magonza, Colonia ed Erfurt — una delle pagine più cupe dell'epoca."},
    {scene:"city",tag:"Le città renane",text:"Centri popolosi e nodi di traffico come Norimberga e Colonia sono colpiti duramente: la mortalità urbana accelera per densità e scambi continui."}]},
  {name:"Norway",label:"Norvegia",ll:[62.48,10.21],slides:[
    {scene:"north",tag:"1349 · la nave alla deriva",text:"<b>Norvegia.</b> Secondo la tradizione, una nave alla deriva con l'equipaggio morto approda a Bergen nel 1349, portando la peste nel paese."},
    {scene:"macabre",tag:"Una mortalità enorme",text:"Le stime per la Norvegia sono tra le più alte d'Europa: secondo molti studiosi muore tra metà e due terzi della popolazione."},
    {scene:"memorial",tag:"Fattorie abbandonate",text:"Tanti poderi restano vuoti: gli ødegård, le «fattorie deserte». Il calo demografico segna il paese per generazioni."},
    {scene:"ship",tag:"Verso il nord",text:"Da Bergen la peste risale le coste e penetra nei fiordi, raggiungendo le aree settentrionali nei mesi seguenti."}]},
  {name:"Sweden",label:"Svezia",ll:[59.80,16.74],slides:[
    {scene:"route",tag:"1350 · da sud",text:"<b>Svezia.</b> La peste arriva intorno al 1350, diffondendosi dalle regioni meridionali verso l'interno."},
    {scene:"north",tag:"Lungo le coste",text:"Insediamenti e rotte costiere fanno da vie di contagio; le aree interne, più isolate, sono raggiunte più lentamente."},
    {scene:"memorial",tag:"Brigida di Svezia",text:"In questi anni Brigida, futura santa, interpreta la pestilenza come castigo e invito alla penitenza: la sua voce segna la spiritualità del tempo."},
    {scene:"macabre",tag:"Il bilancio",text:"Anche in Svezia la mortalità è pesante; la perdita di contadini e clero ridisegna economia e vita religiosa."}]},
  {name:"Denmark",label:"Danimarca",ll:[55.39,9.90],slides:[
    {scene:"harbor",tag:"1350 · le rotte del Baltico",text:"<b>Danimarca.</b> Crocevia tra Mare del Nord e Baltico, è raggiunta intorno al 1350 lungo le rotte mercantili."},
    {scene:"city",tag:"I mercati",text:"Porti e mercati, fitti di scambi, favoriscono la diffusione rapida del contagio tra le comunità costiere."},
    {scene:"macabre",tag:"La mortalità",text:"Come nel resto della Scandinavia, la perdita di popolazione è grave e lascia terre coltivabili senza braccia."},
    {scene:"scroll",tag:"Conseguenze",text:"Lo spopolamento ridisegna proprietà e lavoro agricolo, con effetti duraturi sull'economia rurale."}]},
  {name:"Poland",label:"Polonia",ll:[52.05,18.94],slides:[
    {scene:"spared",tag:"In gran parte risparmiata",text:"<b>Polonia.</b> Spesso citata come una delle aree meno colpite d'Europa, anche se le stime restano incerte e dibattute."},
    {scene:"crown",tag:"Casimiro III il Grande",text:"Sul trono c'è Casimiro III. Tra le ipotesi: minore integrazione nelle grandi rotte commerciali, bassa densità di popolazione e misure di isolamento ai confini."},
    {scene:"route",tag:"Diffusione limitata",text:"Il contagio tocca alcune zone di confine ma non dilaga come altrove; molte regioni interne sembrano relativamente protette."},
    {scene:"memorial",tag:"Non immune dalle violenze",text:"Pur meno colpita, la Polonia non sfugge del tutto alle accuse e alle violenze contro gli ebrei che attraversano l'Europa centrale in quegli anni."}]},
  {name:"Hungary",label:"Ungheria",ll:[46.84,18.57],slides:[
    {scene:"route",tag:"1349–1350",text:"<b>Ungheria.</b> La peste raggiunge il regno tra il 1349 e il 1350, arrivando da ovest e da sud lungo le vie di terra e fluviali."},
    {scene:"crown",tag:"Luigi I d'Angiò",text:"Sul trono c'è Luigi I il Grande. Le fonti sono frammentarie: alcune aree appaiono colpite meno duramente rispetto all'Europa occidentale."},
    {scene:"city",tag:"Le città",text:"I centri urbani e le rotte commerciali restano i canali principali del contagio, come ovunque in Europa."},
    {scene:"macabre",tag:"Un quadro incerto",text:"I dati ungheresi sono incerti; resta la testimonianza di un'epidemia che non risparmia il cuore dell'Europa centrale."}]}
];

// Lookup di una regione per nome (v12: `byName`) — helper dati condiviso da tour, quiz e igCard.
export const byName = (name: string): PlagueRegion | undefined => PESTE.find((d) => d.name === name);

// Ordine del Tour guidato (nomi = campo 'name' delle regioni).
export const TOUR: string[] = ["France","English territory","Holy Roman Empire","Norway","Scotland","Denmark","Sweden","Hungary","Poland"];

// Durata di ogni tappa del tour, in ms.
export const SLIDE_MS = 5200;

// Domande del quiz; 'a' = nome della regione corretta.
export const QUIZ: QuizItem[] = [
  {a:"France",q:"Dove la peste sbarcò a Marsiglia nel gennaio 1348?"},
  {a:"English territory",q:"Dove arrivò a Melcombe Regis nell'estate 1348?"},
  {a:"Holy Roman Empire",q:"Dove si diffusero i flagellanti e le persecuzioni del 1349?"},
  {a:"Norway",q:"Dove approdò a Bergen una nave alla deriva nel 1349?"},
  {a:"Scotland",q:"Dove i cronisti parlarono della «morte immonda degli inglesi» (1350)?"},
  {a:"Sweden",q:"Quale regno scandinavo, legato a Santa Brigida, fu raggiunto verso il 1350?"},
  {a:"Denmark",q:"Quale crocevia tra Mare del Nord e Baltico fu colpito verso il 1350?"},
  {a:"Poland",q:"Quale regno fu in gran parte risparmiato, sotto Casimiro III?"},
  {a:"Hungary",q:"Quale regno di Luigi I d'Angiò fu raggiunto nel 1349–50?"}
];
