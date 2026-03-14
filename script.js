const SCRYFALL="https://api.scryfall.com/cards/collection"

let cache={}

document.getElementById("deckInput").addEventListener("input",countCards)

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

function countCards(){

const deck=parseDeck(document.getElementById("deckInput").value)

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
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
identifiers:batch.map(n=>({name:n}))
})
})

const data=await res.json()

data.data.forEach(card=>{

cache[card.name]={

type:card.type_line.toLowerCase(),
text:(card.oracle_text||"").toLowerCase(),
cmc:card.cmc

}

})

}

}

async function analyzeDeck(){

const result=document.getElementById("result")

result.innerHTML="Analisando..."

const timeout=setTimeout(()=>{

result.innerHTML="Erro: análise demorou mais que 3 minutos."

},180000)

try{

const deck=parseDeck(document.getElementById("deckInput").value)

const names=[...new Set(deck.map(c=>c.name))]

await fetchCards(names)

let lands=0,ramp=0,draw=0,removal=0,cmc=0,count=0

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

}

})

const avg=(cmc/count).toFixed(2)

result.innerHTML=`

<h2>Resumo do Deck</h2>

Cartas: ${count}<br>
Terrenos: ${lands}<br>
Ramp: ${ramp}<br>
Draw: ${draw}<br>
Remoções: ${removal}<br>
CMC médio: ${avg}

`

clearTimeout(timeout)

}catch(e){

result.innerHTML="Erro durante análise: "+e

}

}

function clearDeck(){

document.getElementById("deckInput").value=""
document.getElementById("result").innerHTML=""
document.getElementById("counter").innerText="Cartas detectadas: 0"

}

function openPopup(){

document.getElementById("popup").style.display="block"

}

function closePopup(){

document.getElementById("popup").style.display="none"

}
