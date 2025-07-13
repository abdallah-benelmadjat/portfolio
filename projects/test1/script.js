// --- SCENE SETUP ---
let scene, camera, renderer, raycaster, stars, handZone;
const mouse = new THREE.Vector2();
let INTERSECTED;

// --- GAME STATE ---
let gameState = {};
const countLabels = [];
let soundSynth;
let isHandHovered = false;

// --- CONSTANTS & CONFIG ---
const CARD_WIDTH = 14;      // Increased from 7
const CARD_HEIGHT = 19.6;   // Increased from 9.8
const BASE_URL = 'https://placehold.co/';
const CARDS_DATA = {
  "103": 5000, "404": 10000, "3310": 1000, "Bligha": 500, "Cassetta": 500,
  "Defra": 1000, "Dhab": { "value": 20000, "isWild": true }, "Fedda": { "value": 15000, "isWild": true },
  "Frigidaire": 5000, "Kaprice": 1000, "Maruti": 10000, "TN": 5000, "Tracteur": 100000, "Zawra": 500
};
const CARD_COUNTS = {
    "Tracteur": 2, "Dhab": 4, "Fedda": 4, "Maruti": 4, "404": 4, "103": 6, "Frigidaire": 6,
    "TN": 6, "3310": 8, "Defra": 8, "Kaprice": 8, "Bligha": 10, "Cassetta": 10, "Zawra": 10
};

const POSITIONS = {
    DECK: new THREE.Vector3(-20, 10, 0),     // Adjusted for larger cards
    DISCARD: new THREE.Vector3(20, 10, 0),   // Adjusted for larger cards
    PLAYER_HAND: { pos: new THREE.Vector3(0, -45, 5), rot: new THREE.Euler(0, 0, 0) },
    PLAYER_ASSETS: { pos: new THREE.Vector3(-48, -32, 0), rot: new THREE.Euler(0, 0, 0) },
    BOT_1_HAND: { pos: new THREE.Vector3(-80, 0, 5), rot: new THREE.Euler(0, 0, Math.PI / 2) }, // Moved further left
    BOT_1_ASSETS: { pos: new THREE.Vector3(-68, 28, 0), rot: new THREE.Euler(0, 0, Math.PI / 2) }, // Moved further left
    BOT_2_HAND: { pos: new THREE.Vector3(0, 48, 5), rot: new THREE.Euler(0, 0, Math.PI) },
    BOT_2_ASSETS: { pos: new THREE.Vector3(48, 35, 0), rot: new THREE.Euler(0, 0, Math.PI) },
    BOT_3_HAND: { pos: new THREE.Vector3(80, 0, 5), rot: new THREE.Euler(0, 0, -Math.PI / 2) }, // Moved further right
    BOT_3_ASSETS: { pos: new THREE.Vector3(68, -28, 0), rot: new THREE.Euler(0, 0, -Math.PI / 2) }, // Moved further right
};
const PLAYER_MAPPING = [
    { hand: POSITIONS.PLAYER_HAND, assets: POSITIONS.PLAYER_ASSETS },
    { hand: POSITIONS.BOT_1_HAND, assets: POSITIONS.BOT_1_ASSETS },
    { hand: POSITIONS.BOT_2_HAND, assets: POSITIONS.BOT_2_ASSETS },
    { hand: POSITIONS.BOT_3_HAND, assets: POSITIONS.BOT_3_ASSETS },
];

// --- DOM ELEMENTS ---
const endTurnBtn = document.getElementById('end-turn-btn');
const turnIndicator = document.getElementById('turn-indicator');
const messageBox = document.getElementById('message-box');
const messageTitle = document.getElementById('message-title');
const messageText = document.getElementById('message-text');
const messageBtn = document.getElementById('message-btn');

// --- GAME LOGIC ---

export function init() {
    scene = new THREE.Scene();
    
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 120;
    camera = new THREE.OrthographicCamera(frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, 1, 1000);
    camera.position.z = 50;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10, 20, 15);
    scene.add(directionalLight);
    
    createDynamicBackground();
    createBoardZones();
    
    raycaster = new THREE.Raycaster();

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('click', () => {
        if (Tone.context.state !== 'running') Tone.context.resume();
        onMouseClick();
    });
    endTurnBtn.addEventListener('click', endTurn);
    messageBtn.addEventListener('click', () => {
        messageBox.style.display = 'none';
        if (gameState.turnState === 'GAME_OVER') startGame();
    });

    setupSound();
    startGame();
    animate();
}

function createDynamicBackground() {
    const starGeo = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 15000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.7 });
    stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
}

function createBoardZones() {
    // Deck and Discard Zones
    [POSITIONS.DECK, POSITIONS.DISCARD].forEach(pos => {
        const zoneGeo = new THREE.PlaneGeometry(CARD_WIDTH + 1, CARD_HEIGHT + 1);
        const zoneMat = new THREE.MeshBasicMaterial({ 
            color: 0x4a5568, 
            transparent: true, 
            opacity: 0.3 
        });
        const zone = new THREE.Mesh(zoneGeo, zoneMat);
        zone.position.set(pos.x, pos.y, pos.z - 0.1);
        scene.add(zone);
    });

    // Player Hand Zone (for hover detection)
    const handZoneGeo = new THREE.PlaneGeometry(100, 30); // Made larger
    const handZoneMat = new THREE.MeshBasicMaterial({ visible: false });
    handZone = new THREE.Mesh(handZoneGeo, handZoneMat);
    handZone.position.copy(POSITIONS.PLAYER_HAND.pos);
    handZone.position.y += 10; // Adjust position to cover hand area
    scene.add(handZone);
}

function setupSound() {
    soundSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 }
    }).toDestination();
}

function playSound(note, duration = '8n') {
    if (soundSynth && Tone.context.state === 'running') {
        soundSynth.triggerAttackRelease(note, duration);
    }
}

function startGame() {
    if (scene.children.length > 5) { // lights, stars, zones
        const objectsToRemove = scene.children.filter(c => c.userData.isCard || c.userData.isCountLabel);
        objectsToRemove.forEach(c => {
            if(c.geometry) c.geometry.dispose();
            if(c.material) {
                if (Array.isArray(c.material)) {
                    c.material.forEach(m => {
                       m.map?.dispose();
                       m.dispose();
                    });
                } else {
                    c.material.map?.dispose();
                    c.material.dispose();
                }
              }
            scene.remove(c);
        });
    }
    countLabels.length = 0;

    gameState = {
        deck: [],
        players: [
            { id: 0, name: 'You', hand: [], assets: [], score: 0, isAI: false },
            { id: 1, name: 'Bot 1', hand: [], assets: [], score: 0, isAI: true },
            { id: 2, name: 'Bot 2', hand: [], assets: [], score: 0, isAI: true },
            { id: 3, name: 'Bot 3', hand: [], assets: [], score: 0, isAI: true }
        ],
        discardPile: [],
        currentPlayerIndex: 0,
        turnState: 'DRAW',
        stealAttempt: null,
    };
    
    createDeck();
    shuffleDeck();
    dealCards();
    updateUI();
    setTurn(0);
}

function createDeck() {
    const textureLoader = new THREE.TextureLoader();
    const cardBackTexture = textureLoader.load(`cards/back.png`); // Load back.png for the card back

    for (const name in CARDS_DATA) {
        const cardData = CARDS_DATA[name];
        const count = CARD_COUNTS[name] || 1;
        const value = typeof cardData === 'object' ? cardData.value : cardData;
        const isWild = typeof cardData === 'object' ? cardData.isWild : false;

        for (let i = 0; i < count; i++) {
            const cardGeo = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
            const cardTexture = textureLoader.load(`cards/${name}.png`); // Load the PNG image for the card front

            const frontMaterial = new THREE.MeshLambertMaterial({ map: cardTexture, transparent: true });
            const backMaterial = new THREE.MeshLambertMaterial({ map: cardBackTexture, transparent: true });

            const cardMesh = new THREE.Mesh(cardGeo, backMaterial);

            cardMesh.userData = {
                name: name, value: value, isWild: isWild, id: `${name}_${i}`, isCard: true, owner: null,
                location: 'DECK', assetIndex: null, isFaceUp: false,
                frontMat: frontMaterial,
                backMat: backMaterial
            };

            cardMesh.position.set(POSITIONS.DECK.x, POSITIONS.DECK.y, 0);

            scene.add(cardMesh);
            gameState.deck.push(cardMesh);
        }
    }
}

function shuffleDeck() {
    for (let i = gameState.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameState.deck[i], gameState.deck[j]] = [gameState.deck[j], gameState.deck[i]];
    }
}

function dealCards() {
    const maxCards = 5; // Number of cards to deal to each player
    const dealDuration = 0.5; // Duration of each card animation
    const delayBetweenCards = 0.1; // Delay between dealing each card

    for (let i = 0; i < maxCards; i++) {
        gameState.players.forEach((player, playerIndex) => {
            const card = gameState.deck.pop();
            if (!card) return;

            player.hand.push(card);
            card.userData.owner = playerIndex;
            card.userData.location = 'HAND';

            if (!player.isAI) card.userData.isFaceUp = true;

            const layout = PLAYER_MAPPING[playerIndex];
            const delay = i * delayBetweenCards;

            gsap.to(card.position, {
                x: layout.hand.pos.x,
                y: layout.hand.pos.y,
                z: layout.hand.pos.z + i * 0.05,
                delay: delay,
                duration: dealDuration,
                onStart: () => playSound('C4', '16n'),
            });

            gsap.to(card.rotation, {
                z: layout.hand.rot.z,
                delay: delay,
                duration: dealDuration,
            });
        });
    }

    setTimeout(updateCardVisuals, maxCards * delayBetweenCards * 1000 + dealDuration * 1000);
}
    
function setTurn(playerIndex) {
    gameState.currentPlayerIndex = playerIndex;
    gameState.turnState = 'DRAW';
    const player = gameState.players[playerIndex];

    document.querySelectorAll('.player-box').forEach(el => el.classList.remove('active'));
    document.getElementById(`player-box-${playerIndex}`).classList.add('active');

    if (player.isAI) {
        turnIndicator.textContent = `${player.name} is thinking...`;
        endTurnBtn.style.display = 'none';
        setTimeout(() => runAITurn(playerIndex), 2000);
    } else {
        turnIndicator.textContent = "Your Turn: Draw a Card";
        endTurnBtn.style.display = 'block';
        endTurnBtn.disabled = true;
    }
}

function endTurn() {
    const player = gameState.players[gameState.currentPlayerIndex];
    if (!player.isAI && (gameState.turnState === 'ACTION' || gameState.turnState === 'AWAITING_STEAL_TARGET')) {
        if (gameState.turnState === 'AWAITING_STEAL_TARGET') {
            player.hand.push(gameState.stealAttempt.stealingCard);
            gameState.stealAttempt = null;
        }
        playSound('A3', '8n');
        const nextPlayer = (gameState.currentPlayerIndex + 1) % gameState.players.length;
        setTurn(nextPlayer);
    }
}

function drawCard(playerId, fromDiscard = false) {
    const player = gameState.players[playerId];
    let card;
    
    if (fromDiscard) {
        if (gameState.discardPile.length === 0) return null;
        card = gameState.discardPile.pop();
    } else {
        if (gameState.deck.length === 0) {
            reshuffleDiscard();
            if (gameState.deck.length === 0) { endGame("Draw"); return null; }
        }
        card = gameState.deck.pop();
    }

    player.hand.push(card);
    card.userData.owner = playerId;
    card.userData.location = 'HAND';
    if (!player.isAI) card.userData.isFaceUp = true;

    playSound('G4', '16n');
    updateCardVisuals();
    updateUI();
    return card;
}

function onMouseClick() {
    if (!INTERSECTED || gameState.players[gameState.currentPlayerIndex].isAI) return;
    const card = INTERSECTED;
    const { location, owner, isWild } = card.userData;
    const playerIndex = gameState.currentPlayerIndex;

    if (gameState.turnState === 'DRAW') {
        if (card.userData.location === 'DECK' || (card === gameState.discardPile[gameState.discardPile.length-1] && card.userData.location === 'DISCARD')) {
            drawCard(playerIndex, location === 'DISCARD');
            gameState.turnState = 'ACTION';
            turnIndicator.textContent = "Your Turn: Play, Discard, or Steal";
            endTurnBtn.disabled = false;
        }
    } else if (gameState.turnState === 'ACTION') {
        if (location === 'HAND' && owner === playerIndex) {
            if (isWild) {
                gameState.turnState = 'AWAITING_STEAL_TARGET';
                gameState.stealAttempt = { stealingCard: card };
                player.hand = player.hand.filter(c => c.userData.id !== card.userData.id);
                turnIndicator.textContent = "STEAL MODE: Choose an opponent's asset stack!";
                playSound('C5', '4n');
                updateCardVisuals();
            } else {
                handlePlayerAction(card);
            }
        }
    } else if (gameState.turnState === 'AWAITING_STEAL_TARGET') {
        if (location === 'ASSETS' && owner !== playerIndex) {
            initiateSteal(card);
        } else {
            gameState.players[playerIndex].hand.push(gameState.stealAttempt.stealingCard);
            gameState.stealAttempt = null;
            gameState.turnState = 'ACTION';
            turnIndicator.textContent = "Your Turn: Play, Discard, or Steal";
            playSound('A#3', '8n');
            updateCardVisuals();
        }
    }
}

function handlePlayerAction(card) {
    const player = gameState.players[0];
    const cardName = card.userData.name;
    const potentialSet = player.hand.filter(c => c.userData.name === cardName);
    const matchingAssetIndex = player.assets.findIndex(assetSet => assetSet[0].userData.name === cardName);

    if (matchingAssetIndex !== -1) {
        playSound('E4', '8n');
        potentialSet.forEach(c => {
            player.hand = player.hand.filter(hc => hc.userData.id !== c.userData.id);
            player.assets[matchingAssetIndex].push(c);
            c.userData.location = 'ASSETS';
            c.userData.assetIndex = matchingAssetIndex;
        });
    } else if (potentialSet.length >= 2) {
        playSound('C4', '8n');
        player.assets.push(potentialSet);
        const newAssetIndex = player.assets.length - 1;
        potentialSet.forEach(c => {
            player.hand = player.hand.filter(hc => hc.userData.id !== c.userData.id);
            c.userData.location = 'ASSETS';
            c.userData.assetIndex = newAssetIndex;
        });
    } else {
        playSound('F3', '8n');
        player.hand = player.hand.filter(c => c.userData.id !== card.userData.id);
        gameState.discardPile.push(card);
        card.userData.location = 'DISCARD';
        card.userData.owner = null;
        card.userData.isFaceUp = true;
        endTurn();
    }
    updateCardVisuals();
    updateUI();
}
    
function initiateSteal(targetAssetCard) {
    const attacker = gameState.players[0];
    const defender = gameState.players[targetAssetCard.userData.owner];
    const { stealingCard } = gameState.stealAttempt;
    const targetAssetSet = defender.assets[targetAssetCard.userData.assetIndex];

    showMessage("Steal Attempt!", `You are using ${stealingCard.userData.name} to steal ${targetAssetCard.userData.name} from ${defender.name}!`, "Resolving...");
    messageBtn.disabled = true;

    setTimeout(() => {
        const defendingCard = defender.hand.find(c => c.userData.isWild);
        if (defendingCard) {
            // DEFENDED
            playSound('G#2', '2n');
            messageTitle.textContent = "Steal Defended!";
            messageText.innerHTML = `${defender.name} defended with a ${defendingCard.userData.name}!`;
            defender.hand = defender.hand.filter(c => c.userData.id !== defendingCard.userData.id);
            [stealingCard, defendingCard].forEach(c => {
                gameState.discardPile.push(c);
                c.userData.location = 'DISCARD';
                c.userData.owner = null;
                c.userData.isFaceUp = true;
            });
        } else {
            // STEAL SUCCESSFUL
            playSound('G5', '2n');
            messageTitle.textContent = "Steal Successful!";
            messageText.innerHTML = `You stole the ${targetAssetCard.userData.name} assets!`;
            defender.assets.splice(targetAssetCard.userData.assetIndex, 1);
            const newSet = [...targetAssetSet];
            attacker.assets.push(newSet);
            newSet.forEach(c => {
                c.userData.owner = attacker.id;
                c.userData.location = 'ASSETS';
            });

            // Move the stealing card to the discard pile
            attacker.hand = attacker.hand.filter(c => c.userData.id !== stealingCard.userData.id); // Remove from hand
            gameState.discardPile.push(stealingCard);
            stealingCard.userData.location = 'DISCARD';
            stealingCard.userData.owner = null;
            stealingCard.userData.isFaceUp = true;

            gameState.players.forEach(p => p.assets.forEach((set, i) => set.forEach(c => c.userData.assetIndex = i)));
        }

        // Reset game state after steal attempt
        gameState.stealAttempt = null;
        gameState.turnState = 'ACTION'; // Allow the player to continue their turn
        turnIndicator.textContent = "Your Turn: Play, Discard, or Steal";
        messageBtn.disabled = false;
        messageBtn.textContent = "Continue";

        updateCardVisuals();
        updateUI();
    }, 2500);
}

function runAITurn(aiPlayerIndex) {
    const ai = gameState.players[aiPlayerIndex];
    drawCard(aiPlayerIndex);
    updateCardVisuals();
    updateUI();

    setTimeout(() => {
        let playedSet = false;
        const cardGroups = {};
        ai.hand.forEach(c => {
            const name = c.userData.name;
            if (!cardGroups[name]) cardGroups[name] = [];
            cardGroups[name].push(c);
        });

        for (const name in cardGroups) {
            if (cardGroups[name].length >= 2) {
                playSound('C3', '8n');
                const newSet = cardGroups[name];
                ai.assets.push(newSet);
                const newAssetIndex = ai.assets.length - 1;
                newSet.forEach(c => {
                    ai.hand = ai.hand.filter(hc => hc.userData.id !== c.userData.id);
                    c.userData.location = 'ASSETS'; c.userData.assetIndex = newAssetIndex; c.userData.isFaceUp = true;
                });
                playedSet = true;
                break; 
            }
        }
        
        if (!playedSet && ai.hand.length > 0) {
            playSound('F2', '8n');
            let cardToDiscard = ai.hand.sort((a, b) => a.userData.value - b.userData.value)[0];
            ai.hand = ai.hand.filter(c => c.userData.id !== cardToDiscard.userData.id);
            gameState.discardPile.push(cardToDiscard);
            cardToDiscard.userData.location = 'DISCARD'; cardToDiscard.userData.owner = null; cardToDiscard.userData.isFaceUp = true;
        }

        updateCardVisuals();
        updateUI();
        
        setTimeout(() => {
            const nextPlayer = (aiPlayerIndex + 1) % gameState.players.length;
            setTurn(nextPlayer);
        }, 1500);
    }, 1500);
}
    
function reshuffleDiscard() {
    if (gameState.discardPile.length <= 1) return;
    playSound('D#4', '4n');
    const topCard = gameState.discardPile.pop();
    gameState.deck = [...gameState.discardPile];
    gameState.discardPile = [topCard];
    gameState.deck.forEach(card => {
        card.userData.location = 'DECK'; card.userData.isFaceUp = false;
    });
    shuffleDeck();
}

function endGame(reason) {
    gameState.turnState = 'GAME_OVER';
    let winner = { name: 'Nobody', score: -1 };
    let scoresText = "";
    
    gameState.players.forEach(p => {
        let score = 0;
        p.assets.forEach(set => set.forEach(card => score += card.userData.value));
        p.score = score;
        scoresText += `${p.name}: ${score} DA<br>`;
        if (score > winner.score) winner = { name: p.name, score: score };
    });

    let title = `${winner.name} Wins!`;
    if (reason === "Draw") scoresText += "<br>The deck ran out of cards.";
    
    showMessage(title, scoresText, "Play Again");
}

function showMessage(title, text, buttonText) {
    messageTitle.innerHTML = title;
    messageText.innerHTML = text;
    messageBtn.textContent = buttonText;
    messageBox.style.display = 'block';
}

function createCountLabel(count) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 64; canvas.height = 64;
    context.fillStyle = 'rgba(0,0,0,0.75)';
    context.beginPath(); context.arc(32, 32, 30, 0, 2 * Math.PI); context.fill();
    context.strokeStyle = '#fbd38d'; context.lineWidth = 4; context.stroke();
    context.fillStyle = 'white'; context.font = 'bold 32px Changa';
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText(count, 32, 34);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const geometry = new THREE.PlaneGeometry(6, 6); // Made count label larger
    const label = new THREE.Mesh(geometry, material);
    label.userData.isCountLabel = true;
    return label;
}

function updateCardVisuals() {
    scene.children.filter(c => c.userData.isCard).forEach(card => {
        const targetMaterial = card.userData.isFaceUp ? card.userData.frontMat : card.userData.backMat;
        if (card.material !== targetMaterial) {
            card.material = targetMaterial;
        }
    });

    gameState.deck.forEach((card, i) => gsap.to(card.position, { x: POSITIONS.DECK.x, y: POSITIONS.DECK.y, z: i * 0.05, duration: 0.5 }));
    gameState.discardPile.forEach((card, i) => {
        gsap.to(card.position, { x: POSITIONS.DISCARD.x, y: POSITIONS.DISCARD.y, z: i * 0.05, duration: 0.5 });
        gsap.to(card.rotation, { x: 0, y: 0, z: 0, duration: 0.5 });
    });

    countLabels.forEach(label => scene.remove(label));
    countLabels.length = 0;

    gameState.players.forEach((player, pIndex) => {
        const layout = PLAYER_MAPPING[pIndex];
        const handSize = player.hand.length;

        // Player Hand Layout
        if (pIndex === 0) {
            const fanAngle = isHandHovered ? 0.10 : 0.04;
            const fanRadius = isHandHovered ? 4 : 0;
            player.hand.forEach((card, i) => {
                if (card.userData.location !== 'HAND') return; // Skip cards not in hand
                const angle = (i - (handSize - 1) / 2) * fanAngle;
                const x = layout.hand.pos.x + Math.sin(angle) * fanRadius + (i - (handSize - 1) / 2) * (isHandHovered ? CARD_WIDTH * 0.8 : CARD_WIDTH * 0.4);
                const y = layout.hand.pos.y + Math.cos(angle) * fanRadius - fanRadius;
                gsap.to(card.position, { x, y, z: layout.hand.pos.z + i * 0.05, duration: 0.4, ease: 'power2.out' });
                gsap.to(card.rotation, { z: angle, duration: 0.4, ease: 'power2.out' });
            });
        } else { // AI Hand Layout
            const handSpread = CARD_WIDTH * 0.5;
            player.hand.forEach((card, i) => {
                if (card.userData.location !== 'HAND') return; // Skip cards not in hand
                let x = layout.hand.pos.x, y = layout.hand.pos.y, z = layout.hand.pos.z + i * 0.05;
                if (pIndex === 1) y += (i - (handSize - 1) / 2) * handSpread;
                else if (pIndex === 2) x -= (i - (handSize - 1) / 2) * handSpread;
                else if (pIndex === 3) y -= (i - (handSize - 1) / 2) * handSpread;
                gsap.to(card.position, { x, y, z, duration: 0.5 });
                gsap.to(card.rotation, { z: layout.hand.rot.z, duration: 0.5 });
            });
        }

        // Asset Layout
        let assetOffsetX = 0, assetOffsetY = 0;
        player.assets.forEach((assetSet) => {
            assetSet.forEach((card, j) => {
                card.userData.isFaceUp = true;
                let x = layout.assets.pos.x, y = layout.assets.pos.y, z = layout.assets.pos.z + j * 0.1;
                if (pIndex === 0) x += assetOffsetX;
                else if (pIndex === 1) y -= assetOffsetY;
                else if (pIndex === 2) x -= assetOffsetX;
                else if (pIndex === 3) y += assetOffsetY;

                // Animate card movement to the stack
                gsap.to(card.position, { x, y, z, duration: 0.5 });
                gsap.to(card.rotation, { x: layout.assets.rot.x, y: layout.assets.rot.y, z: layout.assets.rot.z, duration: 0.5 });
            });

            // Remove any existing count label for this stack
            const existingLabelIndex = countLabels.findIndex(label => label.userData.assetSet === assetSet);
            if (existingLabelIndex !== -1) {
                scene.remove(countLabels[existingLabelIndex]);
                countLabels.splice(existingLabelIndex, 1);
            }

            // Create and position the count label directly at the correct position
            const label = createCountLabel(assetSet.length);
            const lastCard = assetSet[assetSet.length - 1];
            label.position.set(
                layout.assets.pos.x + (pIndex === 0 ? assetOffsetX : pIndex === 2 ? -assetOffsetX : 0),
                layout.assets.pos.y + (pIndex === 1 ? -assetOffsetY : pIndex === 3 ? assetOffsetY : 0),
                layout.assets.pos.z + assetSet.length * 0.1 + 0.5
            );
            label.userData.assetSet = assetSet; // Associate label with the asset set
            scene.add(label);
            countLabels.push(label);

            if (pIndex % 2 === 0) assetOffsetX += CARD_WIDTH + 2;
            else assetOffsetY += CARD_WIDTH + 2;
        });
    });
}

function updateUI() {
    gameState.players.forEach((p, i) => {
        let score = 0;
        p.assets.forEach(set => set.forEach(card => score += card.userData.value));
        p.score = score;
        document.getElementById(`player-score-${i}`).textContent = score;
        if (p.isAI) {
            document.getElementById(`player-card-count-${i}`).textContent = p.hand.length;
        }
    });
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 120;
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
    
function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function animate() {
    requestAnimationFrame(animate);
    
    stars.rotation.x += 0.0001;
    stars.rotation.y += 0.0002;

    raycaster.setFromCamera(mouse, camera);
    
    // Hand hover check
    const handIntersects = raycaster.intersectObject(handZone);
    const newHandHoverState = handIntersects.length > 0;
    if (newHandHoverState !== isHandHovered) {
        isHandHovered = newHandHoverState;
        updateCardVisuals();
    }

    const cardIntersects = raycaster.intersectObjects(scene.children.filter(c => c.userData.isCard));
    const canInteract = !gameState.players?.[gameState.currentPlayerIndex]?.isAI;

    if (canInteract && cardIntersects.length > 0) {
        let intersectedObject = cardIntersects[0].object;
        // Allow clicking the top card of the deck or discard pile
        if (intersectedObject.userData.location === 'DECK') intersectedObject = gameState.deck[gameState.deck.length - 1];
        if (intersectedObject.userData.location === 'DISCARD') intersectedObject = gameState.discardPile[gameState.discardPile.length - 1];

        if (!intersectedObject) { // Safety check if deck/discard is empty
             if (INTERSECTED) {
                gsap.to(INTERSECTED.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
                if(INTERSECTED.userData.location === 'HAND') {
                    gsap.to(INTERSECTED.position, { y: POSITIONS.PLAYER_HAND.pos.y, duration: 0.2 });
                }
             }
             INTERSECTED = null;
             return; // Exit early
        }

        const { location, owner } = intersectedObject.userData;
        
        let isHoverable = false;
        if (gameState.turnState === 'DRAW') isHoverable = location === 'DECK' || location === 'DISCARD';
        else if (gameState.turnState === 'ACTION') isHoverable = location === 'HAND' && owner === 0;
        else if (gameState.turnState === 'AWAITING_STEAL_TARGET') isHoverable = location === 'ASSETS' && owner !== 0;

        if (isHoverable) {
            if (INTERSECTED != intersectedObject) {
                if (INTERSECTED) {
                    gsap.to(INTERSECTED.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
                    if(INTERSECTED.userData.location === 'HAND') {
                       gsap.to(INTERSECTED.position, { y: POSITIONS.PLAYER_HAND.pos.y + 4, duration: 0.2 }); // Increased hover lift
                    }
                }
                INTERSECTED = intersectedObject;
                gsap.to(INTERSECTED.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.2 });
                if(location === 'HAND') {
                    gsap.to(INTERSECTED.position, { y: POSITIONS.PLAYER_HAND.pos.y + 4, duration: 0.2 }); // Increased hover lift
                }
            }
        } else {
             if (INTERSECTED) {
                gsap.to(INTERSECTED.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
                if(INTERSECTED.userData.location === 'HAND') {
                      gsap.to(INTERSECTED.position, { y: POSITIONS.PLAYER_HAND.pos.y, duration: 0.2 });
                }
             }
             INTERSECTED = null;
        }
    } else {
        if (INTERSECTED) {
             gsap.to(INTERSECTED.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
             if(INTERSECTED.userData.location === 'HAND') {
                gsap.to(INTERSECTED.position, { y: POSITIONS.PLAYER_HAND.pos.y, duration: 0.2 });
             }
        }
        INTERSECTED = null;
    }

    // Steal mode glow effect
    scene.children.filter(c => c.userData.isCard && c.userData.location === 'ASSETS').forEach(card => {
        const isTarget = gameState.turnState === 'AWAITING_STEAL_TARGET' && card.userData.owner !== 0;
        const material = card.material;
        
        if (isTarget) {
            const time = Date.now() * 0.005;
            const glow = Math.sin(time) * 0.15 + 0.85;
            material.color.setRGB(1, glow, glow);
        } else {
            material.color.setRGB(1, 1, 1);
        }
    });

    renderer.render(scene, camera);
}