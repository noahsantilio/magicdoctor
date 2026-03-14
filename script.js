async function analyzeDeck(){

const link = document.getElementById("deckLink").value
const resultBox = document.getElementById("result")

if(!link.includes("moxfield")){
alert("Use um link do Moxfield")
return
}

try{

const deckID = link.split("/decks/")[1].split("?")[0]

resultBox.textContent = "Lendo deck..."

const response = await fetch(
`https://api.moxfield.com/v2/decks/all/${deckID}`
)

const data = await response.json()

const cards = Object.values(data.mainboard)

let totalCards = 0

cards.forEach(card=>{
totalCards += card.quantity
})

const decklist = cards
.map(card => card.quantity + " " + card.card.name)
.join("\n")

const commander =
data.commanders ?
Object.values(data.commanders)[0].card.name :
"Unknown"

resultBox.textContent = `
Commander: ${commander}

Total de cartas: ${totalCards}

Decklist:

${decklist}
`

}catch(error){

resultBox.textContent =
"Erro ao ler o deck. Verifique se o link é público."

}

}
