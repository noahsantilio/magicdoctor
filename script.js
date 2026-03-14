const SCRYFALL_API="https://api.scryfall.com/cards/collection"

let cardCache = JSON.parse(localStorage.getItem("cardCache") || "{}")

// ========================
// CONTADOR DE CARTAS
// ========================

document.getElementById("deckList").addEventListener("input",()=>{

const deck=parseDeckList(document.getElementById("deckList").value)

let total=0

for(const c of deck) total+=c.qty

document.getElementById("cardCounter").innerText="Cartas detectadas: "+total

})

// ========================
// LIMPAR
// ========================

function clearAnalysis(){

document.getElementById("result").innerHTML=""
document.getElementById("deckList").value=""
document.getElementById("cardCounter").innerText="Cartas detectadas: 0"

}

// ========================
// PARSER
// ========================

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

// ========================
// FETCH CARTAS
// ========================

async function fetchCards(names){

const missing=names.filter(n=>!cardCache[n])

if(missing.length===0) return

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

localStorage.setItem("cardCache",JSON.stringify(cardCache))

}

// ========================
// ANALISE ESTRUTURAL
// ========================

function analyzeStructure(deck){

let lands=0
let ramp=0
let draw=0
let removal=0
let interaction=0
let cmcTotal=0
let count=0

for(const card of deck){

const info=cardCache[card.name]

if(!info)continue

for(let i=0;i<card.qty;i++){

count++

cmcTotal+=info.cmc

if(info.type.includes("land")) lands++

if(info.text.includes("search your library for a land")) ramp++

if(info.text.includes("draw")) draw++

if(info.text.includes("destroy")||info.text.includes("exile")) removal++

if(info.text.includes("counter target")) interaction++

}

}

return{

lands,
ramp,
draw,
removal,
interaction,
avgCMC:(cmcTotal/count).toFixed(2)

}

}

// ========================
// DETECTAR COMBOS
// ========================

function detectCombos(deck){

let found=[]

for(const combo of combos){

let ok=true

for(const piece of combo.cards){

if(!deck.find(c=>c.name===piece)) ok=false

}

if(ok) found.push(combo.name)

}

return found

}

// ========================
// DETECTAR INFINITE
// ========================

function detectInfinite(deck){

let found=[]

for(const combo of infiniteCombos){

let ok=true

for(const piece of combo.cards){

if(!deck.find(c=>c.name===piece)) ok=false

}

if(ok) found.push(combo.name)

}

return found

}

// ========================
// DETECTAR WINCON
// ========================

function detectWinConditions(deck){

let found=[]

for(const win of winConditions){

if(deck.find(c=>c.name===win)) found.push(win)

}

return found

}

// ========================
// DETECTAR ARQUETIPOS
// ========================

function detectArchetypes(deck){

let scores={}

for(const key in archetypes){

scores[key]=0

for(const card of deck){

const info=cardCache[card.name]

if(!info) continue

for(const keyword of archetypes[key]){

if(info.text.includes(keyword))
scores[key]+=card.qty

}

}

}

return scores

}

// ========================
// POWER LEVEL
// ========================

function calculatePower(structure,combos,infinite){

let score=0

if(structure.ramp>=10) score+=1
if(structure.draw>=10) score+=1
if(structure.removal>=8) score+=1
if(structure.avgCMC<3) score+=1
if(combos.length>0) score+=2
if(infinite.length>0) score+=3

if(score<=2) return "Battlecruiser"
if(score<=4) return "Casual"
if(score<=6) return "Focused"
if(score<=8) return "High Power"

return "cEDH"

}

// ========================
// ANALISE PRINCIPAL
// ========================

async function analyzeDeck(){

const result=document.getElementById("result")

result.innerHTML="Analisando..."

const raw=document.getElementById("deckList").value

const deck=parseDeckList(raw)

const names=[...new Set(deck.map(c=>c.name))]

await fetchCards(names)

const structure=analyzeStructure(deck)

const combosFound=detectCombos(deck)

const infiniteFound=detectInfinite(deck)

const winFound=detectWinConditions(deck)

const archetypeScores=detectArchetypes(deck)

const power=calculatePower(structure,combosFound,infiniteFound)

// ========================
// RENDER
// ========================

result.innerHTML=`

<h2>Resultado da análise</h2>

Power Level: ${power}

<h3>Estrutura</h3>

Terrenos: ${structure.lands}<br>
Ramp: ${structure.ramp}<br>
Card Draw: ${structure.draw}<br>
Removal: ${structure.removal}<br>
Interaction: ${structure.interaction}<br>
CMC médio: ${structure.avgCMC}

<h3>Combos</h3>

${combosFound.length?combosFound.join("<br>"):"Nenhum"}

<h3>Combos Infinitos</h3>

${infiniteFound.length?infiniteFound.join("<br>"):"Nenhum"}

<h3>Win Conditions</h3>

${winFound.length?winFound.join("<br>"):"Nenhuma"}

<h3>Arquétipos</h3>

${Object.entries(archetypeScores)
.sort((a,b)=>b[1]-a[1])
.slice(0,3)
.map(a=>a[0]+" ("+a[1]+")")
.join("<br>")}

`

}
