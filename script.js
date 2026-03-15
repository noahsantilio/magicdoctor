const SCRYFALL="https://api.scryfall.com/cards/collection"

let cache={}

window.onload=()=>{

document
.getElementById("deckInput")
.addEventListener("input",updateCounter)

document
.getElementById("analyzeBtn")
.addEventListener("click",analyzeDeck)

document
.getElementById("clearBtn")
.addEventListener("click",clearDeck)

}

function cleanName(name){

return name
.replace(/\(.+\)/,"")
.replace(/[0-9]+$/,"")
.trim()

}

function parseDeck(text){

let deck=[]

text.split("\n").forEach(line=>{

const match=line.match(/^(\d+)\s(.+)/)

if(!match)return

deck.push({

qty:parseInt(match[1]),
name:cleanName(match[2])

})

})

return deck

}

function updateCounter(){

const deck=parseDeck(
document.getElementById("deckInput").value
)

let total=0

deck.forEach(c=>total+=c.qty)

document.getElementById("counter").innerText=
"Cartas detectadas: "+total

}

async function fetchCards(names){

const batches=[]

while(names.length){

batches.push(names.splice(0,75))

}

for(const batch of batches){

const response=await fetch(SCRYFALL,{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

identifiers:batch.map(n=>({name:n}))

})

})

if(!response.ok){

throw new Error("Erro na API Scryfall")

}

const data=await response.json()

data.data.forEach(card=>{

cache[card.name]={

cmc:card.cmc,
type:card.type_line.toLowerCase(),
text:(card.oracle_text||"").toLowerCase(),
legendary:card.type_line.includes("Legendary")

}

})

}

}

function detectCommander(deck){

for(const card of deck){

const info=cache[card.name]

if(!info)continue

if(info.legendary && !info.type.includes("land")){

return card.name

}

}

return "Não detectado"

}

function detectCombos(deck){

let found=[]

combos.forEach(combo=>{

if(combo.cards.every(c=>

deck.some(d=>d.name===c)

)){

found.push(combo.name)

}

})

return found

}

function detectWincons(deck){

return deck
.filter(c=>winConditions.includes(c.name))
.map(c=>c.name)

}

function detectArchetype(deck){

let scores={}

deck.forEach(card=>{

const text=cache[card.name]?.text

if(!text)return

for(const arch in archetypes){

archetypes[arch].forEach(key=>{

if(text.includes(key)){

scores[arch]=(scores[arch]||0)+1

}

})

}

})

const sorted=
Object.entries(scores)
.sort((a,b)=>b[1]-a[1])

return sorted[0]?.[0]||"Desconhecido"

}

function calculatePower(metrics){

let score=5

score+=metrics.ramp*0.05
score+=metrics.draw*0.05
score+=metrics.removal*0.04
score+=metrics.combos*0.5

return Math.min(10,score.toFixed(1))

}

async function analyzeDeck(){

const result=document.getElementById("result")

result.innerHTML="Analisando..."

const timeout=setTimeout(()=>{

result.innerHTML=
"Erro: análise demorou mais de 3 minutos."

},180000)

try{

const deck=parseDeck(
document.getElementById("deckInput").value
)

if(deck.length===0){

throw new Error("Nenhuma carta detectada")

}

const names=[...new Set(deck.map(c=>c.name))]

await fetchCards([...names])

let ramp=0
let draw=0
let removal=0
let interaction=0
let lands=0
let cmc=0
let total=0

deck.forEach(card=>{

const info=cache[card.name]

if(!info)return

for(let i=0;i<card.qty;i++){

total++

cmc+=info.cmc

if(info.type.includes("land"))lands++

if(info.text.includes("search your library"))ramp++

if(info.text.includes("draw"))draw++

if(info.text.includes("destroy")
||info.text.includes("exile"))
removal++

if(info.text.includes("counter"))
interaction++

}

})

const commander=detectCommander(deck)
const archetype=detectArchetype(deck)
const combosFound=detectCombos(deck)
const wincons=detectWincons(deck)

const avgCMC=(cmc/total).toFixed(2)

const power=calculatePower({

ramp,
draw,
removal,
combos:combosFound.length

})

result.innerHTML=`

<h2>Resumo</h2>

Commander: ${commander}<br>
Arquétipo: ${archetype}<br>
Cartas: ${total}<br>
Terrenos: ${lands}

<h3>Análise</h3>

CMC médio: ${avgCMC}<br>
Ramp: ${ramp}<br>
Draw: ${draw}<br>
Remoções: ${removal}

<h3>Win Conditions</h3>

${wincons.join(", ")||"Não detectado"}

<h3>Combos</h3>

${combosFound.join(", ")||"Nenhum"}

<h3>Power Level</h3>

${power}/10

`

drawChart(ramp,draw,removal,interaction,wincons.length)

clearTimeout(timeout)

}catch(err){

clearTimeout(timeout)

result.innerHTML=
"Falha na análise: "+err.message

}

}

function drawChart(ramp,draw,removal,interaction,wincons){

new Chart(document.getElementById("chart"),{

type:"bar",

data:{
labels:[
"Ramp",
"Draw",
"Removal",
"Interaction",
"Wincons"
],
datasets:[{
data:[
ramp,
draw,
removal,
interaction,
wincons
]
}]
}

})

}

function clearDeck(){

document.getElementById("deckInput").value=""
document.getElementById("counter").innerText="Cartas detectadas: 0"
document.getElementById("result").innerHTML=""

}
