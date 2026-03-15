const SCRYFALL="https://api.scryfall.com/cards/collection"

let cache={}

const input=document.getElementById("deckInput")

input.addEventListener("input",updateCounter)

function cleanName(name){

return name
.replace(/\(.+\)/,"")
.replace(/[0-9]+$/,"")
.trim()

}

function parseDeck(text){

let deck=[]

text.split("\n").forEach(line=>{

const m=line.match(/^(\d+)\s(.+)/)

if(!m)return

deck.push({

qty:parseInt(m[1]),
name:cleanName(m[2])

})

})

return deck

}

function updateCounter(){

const deck=parseDeck(input.value)

let total=0

deck.forEach(c=>total+=c.qty)

document.getElementById("counter").innerText="Cartas detectadas: "+total

}

async function fetchCards(names){

const batches=[]

while(names.length) batches.push(names.splice(0,75))

for(const batch of batches){

const res=await fetch(SCRYFALL,{

method:"POST",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify({

identifiers:batch.map(n=>({name:n}))

})

})

const data=await res.json()

data.data.forEach(card=>{

cache[card.name]={

type:card.type_line.toLowerCase(),

text:(card.oracle_text||"").toLowerCase(),

cmc:card.cmc,

legendary:card.type_line.includes("Legendary"),

name:card.name

}

})

}

}

function detectCommander(cards){

return cards.find(c=>cache[c.name]?.legendary)

}

function detectCombos(deck){

let found=[]

combos.forEach(combo=>{

if(combo.cards.every(card=>deck.some(d=>d.name===card))){

found.push(combo.name)

}

})

return found

}

function detectWincons(deck){

return deck.filter(card=>winConditions.includes(card.name)).map(c=>c.name)

}

function detectArchetype(cards){

let scores={}

cards.forEach(card=>{

const text=cache[card.name]?.text

for(const arch in archetypes){

archetypes[arch].forEach(key=>{

if(text?.includes(key)){

scores[arch]=(scores[arch]||0)+1

}

})

}

})

return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0]?.[0]||"Unknown"

}

function powerLevel(metrics){

let score=5

score+=metrics.ramp/10

score+=metrics.draw/10

score+=metrics.removal/10

score+=metrics.combos*0.5

return Math.min(10,score.toFixed(1))

}

async function analyzeDeck(){

const result=document.getElementById("result")

result.innerHTML="Analisando..."

try{

const deck=parseDeck(input.value)

const names=[...new Set(deck.map(c=>c.name))]

await fetchCards([...names])

let lands=0,ramp=0,draw=0,removal=0,interaction=0,cmc=0,count=0

deck.forEach(card=>{

const info=cache[card.name]

if(!info)return

for(let i=0;i<card.qty;i++){

count++

cmc+=info.cmc

if(info.type.includes("land"))lands++

if(info.text.includes("search your library"))ramp++

if(info.text.includes("draw"))draw++

if(info.text.includes("destroy")||info.text.includes("exile"))removal++

if(info.text.includes("counter target"))interaction++

}

})

const commander=detectCommander(deck)

const archetype=detectArchetype(deck)

const combosFound=detectCombos(deck)

const wincons=detectWincons(deck)

const avg=(cmc/count).toFixed(2)

const power=powerLevel({

ramp,draw,removal,combos:combosFound.length

})

result.innerHTML=`

<h2>Resumo</h2>

Commander: ${commander?.name||"não detectado"}<br>
Arquétipo: ${archetype}<br>
Cartas: ${count}<br>

<h3>Análise</h3>

CMC médio: ${avg}<br>
Ramp: ${ramp}<br>
Draw: ${draw}<br>
Remoções: ${removal}<br>

<h3>Condições de vitória</h3>

${wincons.join(", ")||"não detectado"}

<h3>Combos</h3>

${combosFound.join(", ")||"nenhum"}

<h3>Power Level estimado</h3>

${power} / 10

`

drawChart(ramp,draw,removal,interaction,wincons.length)

}catch(e){

result.innerHTML="Erro durante análise: "+e

}

}

function drawChart(ramp,draw,removal,interaction,wincons){

new Chart(document.getElementById("chart"),{

type:"bar",

data:{

labels:["Ramp","Draw","Removal","Interaction","Wincons"],

datasets:[{

data:[ramp,draw,removal,interaction,wincons]

}]

}

})

}

function clearDeck(){

input.value=""

document.getElementById("counter").innerText="Cartas detectadas: 0"

document.getElementById("result").innerHTML=""

}
