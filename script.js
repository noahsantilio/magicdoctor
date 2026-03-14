function toggleInputMode(){

const mode = document.getElementById("inputMode").value
const linkField = document.getElementById("deckLink")
const listField = document.getElementById("deckList")

if(mode === "moxfield"){

linkField.style.display = "block"
listField.style.display = "none"

}else{

linkField.style.display = "none"
listField.style.display = "block"

}

}

async function analyzeDeck(){

const mode = document.getElementById("inputMode").value
const resultBox = document.getElementById("result")

let cards = []

try{

if(mode === "moxfield"){

const link = document.getElementById("deckLink").value.trim()

const match = link.match(/moxfield\.com\/decks\/([A-Za-z0-9\-_]+)/)

if(!match){
alert("Use um link válido do Moxfield")
return
}

const deckID = match[1]

resultBox.textContent = "Lendo deck do Moxfield..."

const response = await fetch(
`https://api.moxfield.com/v2/decks/${deckID}`
)

if(!response.ok){
throw new Error("Deck não encontrado ou não público")
}

const data = await response.json()

cards = Object.values(data.mainboard).map(card => ({
name: card.card.name,
quantity: card.quantity,
type: card.card.type_line,
cmc: card.card.cmc
}))

}else{

const rawList = document.getElementById("deckList").value

const lines = rawList.split("\n")

lines.forEach(line=>{

const match = line.match(/^(\d+)\s(.+)/)

if(match){

ca
