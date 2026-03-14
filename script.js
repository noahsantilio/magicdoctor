const SCRYFALL_API="https://api.scryfall.com/cards/collection"

let cardCache={}

// =======================
// LIMPAR ANALISE
// =======================

function clearAnalysis(){

document.getElementById("result").innerHTML=""
document.getElementById("deckList").value=""

}

// =======================
// PARSER DE LISTA
// =======================

function parseDeckList(text){

const lines=text.split("\n")

let cards=[]

for(let line of lines){

line=line.trim()

if(!line)continue

const match=line.match(/^(\d+)\s(.+)/)

if(!match)continue

let qty=parseInt(match[1])

let name=match[2]
.replace(/\(.*?\)/g,"")
.replace(/\[.*?\]/g,"")
.trim()

cards.push({name,qty})

}

return cards

}

// =======================
// FETCH DE CARTAS
// =======================

async function fetchCards(names){

const missing=names.filter(n=>!cardCache[n])

if(missing.length===0)return

const response=await fetch(SCRYFALL_API,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
identifiers:missing.map(n=>({name:n}))
})
})

const data=await response.json()

for(const card of data.data){

cardCache[card.name]={

text:(card.oracle_text||"").toLowerCase(),

type:(card.type_line||"").toLowerCase(),

cmc:card.cmc||0

}

}

}

// =======================
// ANALISE ESTRUTURAL
// =======================

function analyzeStructure(deck,cardDB){

let lands=0
let ramp=0
let draw=0
let removal=0
let interaction=0
let cmcTotal=0
let cardCount=0

for(const card of deck){

const info=cardDB[card.name]

if(!info)continue

for(let i=0;i<card.qty;i++){

cardCount++

cmcTotal+=info.cmc

if(info.type.includes("land"))lands++

if(info.text.includes("search your library for a land"))ramp++

if(info.text.includes("draw"))draw++

if(info.text.includes("destroy")||info.text.includes("exile"))removal++

if(info.text.includes("counter target"))interaction++

}

}

const avgCMC=(cmcTotal/cardCount).toFixed(2)

return{
lands,
ramp,
draw,
removal,
interaction,
avgCMC
}

}

// =======================
// DETECTAR COMBOS
// =======================

function detectCombos(deck){

let found=[]

for(const combo of combos){

let ok=true

for(const piece of combo.cards){

if(!deck.find(c=>c.name===piece))
ok=false

}

if(ok)found.push(combo.name)

}

return found

}

// =======================
// DETECTAR ARQUETIPOS
// =======================

function detectArchetypes(deck,cardDB){

let scores={}

for(const key in archetypes){

scores[key]=0

for(const card of deck){

const info=cardDB[card.name]

if(!info)continue

for(const keyword of archetypes[key]){

if(info.text.includes(keyword))
scores[key]+=card.qty

}

}

}

return scores

}

// =======================
// CALCULAR POWER LEVEL
// =======================

function calculatePower(structure,combosFound){

let score=0

if(structure.ramp>=10)score+=1
if(structure.draw>=10)score+=1
if(structure.removal>=8)score+=1
if(combosFound.length>0)score+=2
if(structure.avgCMC<3)score+=1

if(score<=1)return "Battlecruiser"
if(score<=3)return "Casual"
if(score<=5)return "Focused"
if(score<=7)return "High Power"

return "cEDH"

}

// =======================
// ANALISE PRINCIPAL
// =======================

async function analyzeDeck(){

const result=document.getElementById("result")

result.innerHTML="Analisando..."

const raw=document.getElementById("deckList").value

const deck=parseDeckList(raw)

if(deck.length===0){

result.innerHTML="Nenhuma carta detectada"

return

}

const names=[...new Set(deck.map(c=>c.name))]

await fetchCards(names)

let cardDB={}

for(const name of names){

cardDB[name]=cardCache[name]

}

// =======================
// ANALISES
// =======================

const structure=analyzeStructure(deck,cardDB)

const combosFound=detectCombos(deck)

const archetypeScores=detectArchetypes(deck,cardDB)

const power=calculatePower(structure,combosFound)

// =======================
// RENDER RESULTADO
// =======================

result.innerHTML=`

<h2>Resultados da análise</h2>

<div class="metric">

<span class="tooltip"
title="Estimativa baseada em ramp, draw, remoções, combos e curva de mana">

Power Level:
</span>

${power}

</div>

<div class="metric">

<span class="tooltip"
title="Quantidade de terrenos no deck">

Terrenos:
</span>

${structure.lands}

</div>

<div class="metric">

<span class="tooltip"
title="Cartas que aceleram mana">

Ramp:
</span>

${structure.ramp}

</div>

<div class="metric">

<span class="tooltip"
title="Cartas que compram cartas">

Card Draw:
</span>

${structure.draw}

</div>

<div class="metric">

<span class="tooltip"
title="Cartas que removem permanentes">

Removal:
</span>

${structure.removal}

</div>

<div class="metric">

<span class="tooltip"
title="Cartas que interagem na pilha ou impedem jogadas">

Interaction:
</span>

${structure.interaction}

</div>

<div class="metric">

CMC Médio:
${structure.avgCMC}

</div>

<h3>Combos detectados</h3>

${combosFound.length?combosFound.join("<br>"):"Nenhum"}

<h3>Arquétipos prováveis</h3>

${Object.entries(archetypeScores)
.sort((a,b)=>b[1]-a[1])
.slice(0,3)
.map(a=>a[0]+" ("+a[1]+")")
.join("<br>")}

`

}
