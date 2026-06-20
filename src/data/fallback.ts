// Esempi offline (Roma · Colombo · Peste) usati quando l'IA non risponde.
// PORTATI LETTERALMENTE dal v12 — includono i campi 'detail' delle timeline (issue B2).
// Tipizzati come SceneSpec; Claude Code potrà stringere i tipi in fase di migrazione.

import type { SceneSpec } from "../types/scene";

export const FALLBACK: Record<string, SceneSpec> = {
  roma:{title:"Espansione di Roma",period:"500 a.C. – 200 d.C.",yearStart:-500,yearEnd:200,archetype:"territory",
    subject:"Rome",aliases:["Rome","Roman Republic","Roman Empire"],
    summary:"Da città-stato del Lazio a impero mediterraneo, fino alla massima estensione del II secolo.",
    teaching:{timeline:[
      {year:-509,event:"Nascita della Repubblica",detail:"Secondo la tradizione i Romani cacciano l'ultimo re etrusco, Tarquinio il Superbo, e fondano la Repubblica. Il potere passa a magistrati eletti annualmente, i consoli, affiancati dal Senato: è la cornice istituzionale che accompagnerà gran parte dell'espansione."},
      {year:-264,event:"Guerre puniche",detail:"Inizia lo scontro con Cartagine per il Mediterraneo occidentale. Tre guerre, dal 264 al 146 a.C., spingono Roma a dotarsi di una flotta e a conquistare Sicilia, Spagna e infine Cartagine: è il salto da potenza italica a potenza mediterranea."},
      {year:-27,event:"Augusto, primo imperatore",detail:"Dopo le guerre civili seguite alla morte di Cesare, Ottaviano diventa Augusto e concentra i poteri pur mantenendo le forme repubblicane. Comincia il Principato e la pax romana, una lunga stabilità che favorisce commerci ed espansione."},
      {year:117,event:"Massima estensione (Traiano)",detail:"Sotto Traiano l'impero tocca la massima estensione, dalla Britannia alla Mesopotamia, dopo le conquiste di Dacia e Oriente. Da qui la spinta si arresta: prevale la difesa dei confini e i successori abbandonano i territori più esposti."}],
      keyPoints:["Espansione graduale lungo 7 secoli","Le guerre puniche aprirono il Mediterraneo","Repubblica → Impero cambiò la scala del dominio"],
      questions:["Perché Roma riuscì a integrare i popoli conquistati?","Cosa rese instabile un impero così vasto?"]}},
  colombo:{title:"Il primo viaggio di Colombo",period:"agosto – ottobre 1492",yearStart:1492,yearEnd:1492,archetype:"journey",
    items:[{name:"Flotta di Colombo",waypoints:[[37.23,-6.9],[28.1,-17.1],[24,-74.5]],fromYear:1492,toYear:1492,fromDate:"1492-08-03",toDate:"1492-10-12"}],
    summary:"Dalla Spagna alle Canarie e oltre l'Atlantico, fino all'approdo a Guanahani.",
    teaching:{timeline:[
      {year:1492,event:"3 ago: partenza da Palos",detail:"Le tre caravelle salpano dal porto di Palos in Andalusia, finanziate dalla corona di Castiglia subito dopo la fine della Reconquista. L'obiettivo dichiarato è raggiungere le Indie navigando verso ovest."},
      {year:1492,event:"6 set: dalle Canarie",detail:"Dopo una sosta di riparazione alle Canarie, la flotta riparte verso l'oceano aperto sfruttando gli alisei, i venti costanti da est che spingono le navi verso ovest."},
      {year:1492,event:"12 ott: approdo",detail:"Dopo oltre un mese in mare aperto e crescente tensione tra gli equipaggi, arriva l'avvistamento di terra: un'isola delle Bahamas, che Colombo battezza San Salvador, convinto di essere giunto in Asia."}],
      keyPoints:["Rotta verso ovest per le Indie","Lo scalo alle Canarie sfruttava gli alisei","L'approdo era nei Caraibi, non in Asia"],questions:["Perché Colombo sottostimò la circonferenza terrestre?"]}},
  peste:{title:"La peste nera",period:"1347 – 1351",yearStart:1347,yearEnd:1351,archetype:"spread",
    items:[{name:"Peste",originLat:45,originLon:35.4,targets:[[38.2,15.5],[44.4,8.9],[43.3,5.4],[48.85,2.35],[51.5,-0.1],[53.55,10]],fromYear:1347,toYear:1351}],
    summary:"Dal Mar Nero la peste risale le rotte commerciali e dilaga in Europa in pochi anni.",
    teaching:{timeline:[
      {year:1347,event:"Da Caffa a Messina",detail:"La peste arriva in Europa con le navi genovesi in fuga dall'assedio di Caffa, in Crimea. Sbarca a Messina nell'ottobre 1347 e si diffonde rapidamente lungo le rotte marittime del Mediterraneo."},
      {year:1348,event:"Italia e Francia",detail:"Nel 1348 l'epidemia devasta le città italiane e francesi, da Firenze a Parigi. La densità urbana e i commerci ne accelerano la diffusione; intere comunità vengono spazzate via."},
      {year:1349,event:"Inghilterra e Germania",detail:"La peste risale verso nord raggiungendo Inghilterra e Germania lungo le vie commerciali. Di fronte a una mortalità incomprensibile per l'epoca si moltiplicano persecuzioni e capri espiatori."},
      {year:1351,event:"Nord Europa",detail:"Entro il 1351 l'ondata raggiunge la Scandinavia. Si stima sia morto circa un terzo della popolazione europea, con conseguenze profonde su economia, lavoro e struttura sociale."}],
      keyPoints:["Si diffuse lungo le rotte marittime","Uccise forse un terzo dell'Europa","Seguì i commerci, non i confini"],questions:["Perché i porti furono colpiti per primi?"]}},
};
export function pickFallback(q: string): SceneSpec | null {q=q.toLowerCase();if(/rom|impero romano|cesare|traiano/.test(q))return FALLBACK.roma;
  if(/colombo|caravell|america|1492/.test(q))return FALLBACK.colombo;if(/peste|nera|pandemi|black death/.test(q))return FALLBACK.peste;return null;}

