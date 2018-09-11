var HOST = (function(network) {
    'use strict';
    var name;
    var capacity;
    var occupancy; //occupancy
    var connected; //actual number connected (to prevent race conditions)
    var peers;
    var open = false;

    // phase state
    var gametype; // game type (1 of three, 1+H, 2+H, 3+H)
    var phase; // phase of game
    var players;
    var deck; // array of 17 booleans, true = fascist policy, false = liberal policy
    var deckPointer; // 0-16, current index in deck
    var president; // 0-9, current presidential candidate/elected
    var chancellor; // 0-9, current chancellor candidate/elected
    var electionTracker; // failed elections count, 0-3
    var specialElection; // true or false, the current round is a special election round
    var nextPresident; // used to restore old candidate order after a special election
    var liberalScore; // # of liberal policies enacted
    var fascistScore; // # of fascist policies enacted
    var silence; // true if no communication is currently allowed
    var playersIndex; // array of player index numbers that are playing in the game (not spectating)
    var gamesize;
    var yesVotes;
    var noVotes;
    var drawnCards;

    /* checklist
        - give specific info on need-to-know basis (requests) (state change, status change)

        - only give full state info on request

        - player investigated boolean
        - player liberal or fascist (team) variable
        - hitler variable
        - win condition liberals: 5 policies or hitler killed
        - win condition fascists: 6 policies or hitler becomes chancellor when 3+ policies
        - veto power flag at 5 fascist policies
        - 5-6 players -> 1+H (hitler knows)
        - 7-8 -> 2+H (hitler doesn't know)
        - 9-10 -> 3+H (hitler doesn't know)
        - 11 liberal policies, 6 fascist policies in deck
        - powers: 
            investigate - find out what team any player is on (each player can only be investigated once at most)
        
        - round sequence: 
            -Election 
                    1) president choosing chancellor 
                        - cannot choose anyone with a limit flag
                    2) players ready up for voting
                    3) players vote yes or no (silence)
                    4) votes shown at same time
                        - half or less votes => failure, election tracker increments
                            - if election tracker = 3, top card of deck is automatically enacted, power ignored, election tracker = 0, term limits cleared, next round
                                - if < 3 cards in deck, reset deck
                        - vote passes => president and chancellor elected, if 3 or more fascist policies and chancellor is hitler, fascists win
                            - go to Legislative Session
                    
            -Legislative Session
                    - clear all limit flags
                    - limit this chancellor
                    - if 6 or more players remaining, limit president
                1) President draws 3 cards, discards 1, passes 2 to chancellor (silence)
                2) If veto power is active, chancellor can request veto (3) or skip (4) (silence)
                3) If president accepts veto, election tracker + 1 (do checks and top deck if applicable), next round (silence), otherwise skip to (4)
                4) Chancellor enacts 1 policy out of the 2
                    - if 5 liberal policies => liberals win
                    - if 6 fascist policies => fascists win
                    - if 5 fascist policies => activate veto power
                    - if 3 fascist policies => activate hitler auto win warning
                    - if < 3 cards in deck, reset deck
                    - if fascist power => go to executive action, otherwise next round
            -Executive Action
                1) 1 of 4 powers
                    - Investigate Loyalty
                        - president chooses a player without an investigated flag and finds out their team
                            - player gets investigated flag
                    - Call special election
                        - save rotation information, president chooses any other player to be the next president candidate
                            - round proceeds as normal, but goes back to original rotation at the end (can be same candidate twice in this fashion)
                    - Policy Peak
                        - president sees top 3 cards of deck, confirms viewing
                    - Execution
                        - president chooses to kill a player
                            - if hitler => liberals win, otherwise everyone knows dead person is not hitler
                2) if special election, restore original next candidate
    */

    // room info has been requested, return it
    document.addEventListener("onRoomInfoRequest", function(e) {
        if (open) {
            var data = {};
            data.requesterID = e.detail.requesterID;
            data.roomInfo = {};
            data.roomInfo.name = name;
            data.roomInfo.occupancy = occupancy;
            data.roomInfo.capacity = capacity;
            network.masterEmit('answer room info', data);
        }
    });

    // received a join request, return a rejection or an acceptance
    document.addEventListener("onJoinRequest", function(e) {
        if (open) {

            // reject join if at capacity
            if (occupancy >= capacity) {
                network.masterEmit('reject join', e.detail.requesterID);
                return;
            }

            // join is eligible, reserve a slot
            occupancy++;

            // create peer object and signal the offer
            var peer = new SimplePeer({initiator: false, trickle: false});
            peer.username = e.detail.username;

            // send answer token to requester
            peer.on('signal', function (answer) {

                // listen for connection, add to peers list on success
                peer.on('connect', function () {
                    addToPeers(peer);

                    // broadcast that someone has joined, give complete player info
                    var data = peer.player.getData();
                    data.type = 'player joined';

                    broadcastData(data, false, peer.player.slot);
                });

                // emit acceptance data back to master
                var answerData = {};
                answerData.requesterID = e.detail.requesterID;
                answerData.answer = answer;
                network.masterEmit('accept join', answerData);
            });
            peer.signal(e.detail.offer);
        }
    });

    // constructor for player object (holds all info)
    var Player = function(slot) {
        this.username = undefined;
        this.slot = slot;
        this.status = 'spectating';
        this.hitler = false;
        this.fascist = false;
        this.killed = false;
        this.investigated = false;
        this.limited = false;
        this.lastVote = undefined; //last vote

        // constructs broadcast info with optional knowledge of hitler or team affiliation
        this.getData = function(teamInfo, hitlerInfo) {
            var data = {};
            data.username = this.username;
            data.slot = this.slot;

            data.status = this.status;
            data.killed = this.killed;
            data.investigated = this.investigated;
            data.limited = this.limited;
            data.lastVote = this.lastVote;
            if (teamInfo) data.fascist = this.fascist;
            if (hitlerInfo) data.hitler = this.hitler;
            return data;
        };

        this.reset = function() {
            this.status = 'spectating';
            this.hitler = false;
            this.fascist = false;
            this.killed = false;
            this.investigated = false;
            this.limited = false;
            this.lastVote = undefined;
        };
    };

    // reset all players
    var resetGame = function() {
        gametype = undefined;
        playersIndex = [];
        gamesize = 0;
        phase = 'pre-game'; // phase of game
        resetDeck(); // array of 17 binary values, corresponding to liberal and fascist policies
        president = undefined; // 0-9, current presidential candidate/elected
        chancellor = undefined; // 0-9, current chancellor candidate/elected
        electionTracker = 0; // failed elections count, 0-3
        specialElection = false; // true or false, this round is a special election round from the power
        nextPresident = undefined; // used to restore old candidate order after special election
        liberalScore = 0; // # of liberal policies enacted
        fascistScore = 0; // # of fascist policies enacted
        silence = false; // true if no communication is allowed
        yesVotes = 0;
        noVotes = 0;
        drawnCards = undefined;
    };

    // create all player objects
    var setPlayers = function() {
        players = new Array(capacity);
        for (var i = 0; i < capacity; i++) {
            players[i] = new Player(i);
        }
    };

    // reset all players
    var resetPlayers = function() {
        for (var i = 0; i < capacity; i++) {
            players[i].reset();
        }
    };

    var resetDeck = function() {
        var liberalPolicies = 6;
        var fascistPolicies = 11;

        deck = new Array(17);

        for (var i = 0; i < 17; i++) {
            if (liberalPolicies === 0) {
                deck[i] = true;
            } else if (fascistPolicies === 0) {
                deck[i] = false;
            } else if (randomInteger(0, 1)) {
                    deck[i] = true;
                    fascistPolicies--;
            } else {
                    deck[i] = false;
                    liberalPolicies--;
            }
        }
        deckPointer = 0;
    };

    // returns the current state of the game, team and hitler info hidden
    var stateData = function(knowsFascists, knowsHitler) {
        var data = {};
        data.type = 'state';
        data.phase = phase;
        data.gametype = gametype;
        data.electionTracker = electionTracker;
        data.deckPointer = deckPointer;
        data.president = president;
        data.chancellor = chancellor;
        data.liberalScore = liberalScore;
        data.fascistScore = fascistScore;
        data.president = president;
        data.chancellor = chancellor;
        data.drawnCards = drawnCards;
        
        data.players = new Array(capacity);

        for (var i = 0; i < peers.length; i++) {
            if (peers[i]) {
                data.players[i] = players[i].getData(knowsFascists, knowsHitler);
            }
        }

        return data;
    };

    var emitData = function(data, slot) {
        if (peers[slot]) {
            peers[slot].send(JSON.stringify(data));
        }
    };

    // broadcast data to all peers
    var broadcastData = function(data, spectatorsOnly, exclusion) {
        for (var i = 0; i < peers.length; i++) {
            if (peers[i] && i !== exclusion) {
                if (spectatorsOnly && peers[i].player.status !== 'spectating') {
                    continue;
                }
                peers[i].send(JSON.stringify(data));
            }
        }
    };

    // broadcast the state of the game to all players
    var broadcastState = function(optionalType) {
        for (var i = 0; i < peers.length; i++) {
            var state = stateData(); // default state info
            var fascistState = stateData(true, true); // extra info for fascists
            var hitlerState; //extra info for hitler
            // only knows fascists in '1+H' game mode
            if (gametype === '1+H') {
                hitlerState = fascistState;
            } else {
                hitlerState = stateData(false, true);
            }

            if (optionalType) {
                state.type = optionalType;
                fascistState.type = optionalType;
                hitlerState.type = optionalType;
            }

            // give each player state data, extra info going to hitler and fascists
            if (peers[i]) {
                if (peers[i].player.hitler) {
                    peers[i].send(JSON.stringify(hitlerState));
                } else if (peers[i].player.fascist) {
                    peers[i].send(JSON.stringify(fascistState));
                } else {
                    peers[i].send(JSON.stringify(state));
                }
            }
        }
    };

    // emit state of the game to a specific peer
    var emitState = function(peerNumber) {
        var knowsFascists = false;
        var knowsHitler = false;

        // fascist but not Hitler => knows all fascists and Hitler
        if (peers[peerNumber].player.fascist && !peers[peerNumber].player.hitler) {
            knowsFascists = true;
            knowsHitler = true;
        //  Hitler in 5-6 player game => knows fascists and Hitler
        } else if (peers[peerNumber].player.hitler && gametype === '1+H') {
            knowsFascists = true;
            knowsHitler = true;
        // Hitler in 7-10 player game => only knows self
        } else if (peers[peerNumber].player.hitler) {
            knowsHitler = true;
        }

        var returnData = stateData(knowsFascists, knowsHitler);
        returnData.ownSlot = peerNumber;
        peers[peerNumber].send(JSON.stringify(returnData));
    };

    // checks if all players are ready or some other custom status
    var allPlayersReady = function(customStatus) {
        var status = 'ready';
        if (customStatus) {
            status = customStatus;
        }
        for (var i = 0; i < gamesize; i++) {
            if (peers[playersIndex[i]]) {
                if (players[playersIndex[i]].status !== status) return false;
            }
        }
        return true;
    };

    // set all players (playing) to a specific status
    var setAllPlayersStatus = function(status, exceptions) {
        for (var i = 0; i < gamesize; i++) {
            if (peers[playersIndex[i]]) {
                players[playersIndex[i]].status = status;
            }
        }
    };

    // add a connected peer to the peers list
    var addToPeers = function(peer) {
        for (var i = 0; i < peers.length; i++) {
            if (!peers[i]) {
                peer.player = players[i];
                peer.player.username = peer.username;
                peers[i] = peer;
                connected++;
                break;
            }
        }
        // listen for data, process it
        peer.on('data', function(data) {
            //parse
            var parsedData = JSON.parse(data);

            // owner info
            parsedData.username = peer.player.username;
            parsedData.slot = peer.player.slot;

            // process
            processData(parsedData);
        });

        // on close, remove from peers list
        peer.on('close', function() {
            connected--;
            removeFromPeers(peer.player.slot);

            if (phase !== 'pre-game') {
                open = false;
                network.masterEmit('close room');
            }
        });
    };

    // remove from peers
    var removeFromPeers = function(peerIndex) {
        peers[peerIndex] = undefined;
        occupancy--;

        // reset ready status
        if (players[peerIndex].status === 'ready') {
            if (phase === 'pre-game') {
                players[peerIndex].status = 'spectating';
            } else {
                players[peerIndex].status = 'pending';
            }
        }

        // execute replacement algo. if any spectators in room and game in session

        // leave but no replacement
        var data = {};
        data.type = 'player left';
        data.content = peerIndex;

        broadcastData(data);
    };

    var numberOfPlayersReady = function() {
        var count = 0;
        for (var i = 0; i < peers.length; i++) {
            if (peers[i]) {
                if (peers.player.status === 'ready') count++;
            }
        }
        return count;
    };

        // remove from peers
    var getReadyPlayers = function() {
        var readyPlayers = [];
        readyPlayers.push(0); // push host
        for (var i = 1; i < peers.length; i++) {
            if (peers[i]) {
                if (peers[i].player.status === 'ready') readyPlayers.push(i);
            }
        }
        return readyPlayers;
    };

    var randomInteger = function(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    };

    var assignTeams = function(fascistCount) {
        var random;

        // pick a random player to be Hitler
        random = randomInteger(0, gamesize - 1);
        players[playersIndex[random]].fascist = true;
        players[playersIndex[random]].hitler = true;

        // assign the rest of the fascists
        for (var i = 0; i < fascistCount - 1; i++) {
            // randomly pick a player that is not already a fascist, set them to be a fascist
            // otherwise repeat the iteration
            random = randomInteger(0, gamesize - 1);
            if (!players[playersIndex[random]].fascist) {
                players[playersIndex[random]].fascist = true;
            } else {
                i--;
            }
        }
    };

    // 5-10 player index array expected
    var startGame = function (readyPlayers) {
        // set gametype depending on number of players, assign teams
        var fascistCount;
        gamesize = readyPlayers.length;
    
        if (gamesize == 5 || gamesize == 6) {
            gametype = '1+H';
            fascistCount = 2;
        } else if (gamesize == 7 || gamesize == 8) {
            gametype = '2+H';
            fascistCount = 3;
        } else { // 9 or 10
            gametype = '3+H';
            fascistCount = 4;
        }

        // set pending status for all players, add index to players index
        for (var i = 0; i < gamesize; i++) {
            playersIndex.push(readyPlayers[i]);
            players[playersIndex[i]].status = 'pending';
        }

        // assign teams
        assignTeams(fascistCount);

        phase = 'starting';

        // notify that match has started
        broadcastState('begin state');

        // randomly choose first presidential candidate (random integer 0-9)
        // start election
        //startElection(randomInteger(0, 9));
    };

    // start election with given presidential candidate
    var startElection = function(candidate) {
        // skip over spectating players
        while (players[candidate].status === 'spectating') {
            candidate = (candidate + 1) % 9;
        }

        phase = 'election 1'; // president choosing chancellor
        president = candidate;
        chancellor = undefined;
        setAllPlayersStatus('waiting');
        players[president].status = 'choosing chancellor';

        var data = {};
        data.type = 'new candidate';
        data.candidate = president;
        broadcastData(data);
    };


    // setup vote phase, all players must ready up to vote after this
    var candidateVoteSetup = function(candidate) {
        phase = 'election 2'; // pre-vote phase
        chancellor = candidate;
        yesVotes = 0;
        noVotes = 0;
        setAllPlayersStatus('pending'); // need to ready up first

        var data =  {};
        data.type = 'pre-vote';
        data.candidate = chancellor;
        console.log(data);
        broadcastData(data);
    };

    // start candidate vote phase with given chancellor candidate
    var startCandidateVote = function() {
        phase = 'election 3'; // voting phase for candidates
        setAllPlayersStatus('voting'); // need to ready up first

        var data =  {};
        data.type = 'vote start';
        broadcastData(data);

        // end vote after 15s
        setTimeout(endCandidateVote, 8000);
    };

    var getLastVotes = function() {
        var lastVotes = new Array(10);
        for (var i = 0; i < 10; i++) {
            if (players[i].status === 'voted'){
                lastVotes[i] = players[i].lastVote;
            }
        }
        return lastVotes;
    };

    var endCandidateVote = function() {
        for (var i = 0; i < playersIndex.length; i++) {
            if (players[playersIndex[i]].status === 'voting') {
                players[playersIndex[i]].status = 'voted';
                players[playersIndex[i]].lastVote = false;
                noVotes++;
            }
        }

        var data = {};
        data.type = 'vote end';
        data.votes = getLastVotes();
        if (yesVotes > noVotes) {
            if (players[chancellor].hitler && fascistScore >= 3) {
                matchEnd('hitler in power');
                return;
            }

            data.elected = true;
            //broadcast the success
            broadcastData(data);

            setTimeout(legislationSetup, 3000);    
        } else {
            data.elected = false;

            // election failed, resolve topdecking
            if (electionFailed(data)) return;
    
            // broadcast the failure
            broadcastData(data);

            // start next election
            setTimeout(nextRound, 3000);
        }
    };
    

    var nextRound = function() {
        console.log('special');
        console.log(specialElection);
        console.log(nextPresident);
        // if this was a special election, go back to the stored order
        if (specialElection) {
            specialElection = false;
            startElection(nextPresident);
        } else {
            startElection((president + 1) % 9);
        }
    };

    var specialRound = function(next) {
        specialElection = true;
        nextPresident = (president + 1) % 9;
        startElection(next);
    };

    var veto = function() {
        var data = {};
        data.type = 'veto passed';

        // veto passed, resolve potential topdecking
        if (electionFailed(data)) return;

        // broadcast the veto
        broadcastData(data);

        silence = false;

        //next round
        setTimeout(nextRound, 3000);
    };

    //return true if match ended
    var electionFailed = function(data) {
        electionTracker++;
        if (electionTracker === 3) {
            if (deck[deckPointer]) {
                fascistScore++;
                if (fascistScore === 6) {
                    matchEnd('top deck fascist policies');
                    return true;
                }
                data.policy = true;
            } else {
                liberalScore++;
                if (liberalScore === 5) {
                    matchEnd('top deck liberal policies');
                    return true;
                }
                data.policy = false;
            }
            deckPointer++;
            // reshuffle deck if less than 3 cards remaining
            if (deckPointer > 14) {
                resetDeck();
                data.reshuffled = true;
            }
            //clear all limits
            clearLimits();
        }
        return false;
    };

    var revealFascists = function(data) {
        data.fascists = [];
    
        for (var i = 0; i < gamesize; i++) {
            if (players[i].hitler) {
                data.hitler = i;
            }

            if (players[i].fascist) {
                data.fascists.push(i);
            }
        }
    };


    // win conditions
    var matchEnd = function(wintype) {
        var data = {};

        data.type = 'match end';
        data.wintype = wintype;
        revealFascists(data);

        broadcastData(data);
    };


    var legislationSetup = function() {
        phase = 'legislation 1'; // pre-vote phase
        setAllPlayersStatus('waiting');
        clearLimits();

        // limit president and chancellor from becoming chancellor next
        // round depending on gametype
        if (gametype === '2+H' || gametype === '3+H') {
            players[president].limited = true;
        }
        players[chancellor].limited = true;

        // signal that president is about to draw 3 policy cards
        var data =  {};
        data.type = 'pre-policy draw';
        broadcastData(data);
    };

    var broadcastPlayerReady = function(slot) {
        var data = {};
        data.type = 'player ready';
        data.playerIndex = slot;
        broadcastData(data);
    };

    var clearLimits = function() {
        for (var i = 0; i < gamesize; i++) {
            if (peers[playersIndex[i]]) {
                players[playersIndex[i]].limited = false;
            }
        }
    };

    var drawCards = function() {
        drawnCards = new Array(3);
        for (var i = 0; i < 3; i++) {
            drawnCards[i] = deck[deckPointer];
            deckPointer++;
        }
    };

    var discardCard = function(index) {
        drawnCards.splice(index, 1);
    };

    var enactPolicy = function(index) {
        silence = false;
        //fascist policy scored
        console.log(drawnCards);
        var data = {};
        data.type = 'policy enacted';
        if (drawnCards[index]) {
            fascistScore++;

            if (fascistScore === 6) {
                matchEnd('fascist policies');
                return;
            }
            data.policy = true;

        } else {
            liberalScore++;

            if (liberalScore === 5) {
                matchEnd('liberal policies');
                return;
            }
            data.policy = false;
        }

        if (deckPointer > 14) {
            resetDeck();
            data.reshuffled = true;
        }

        // if policy peak, give president peak at policies and proceed to next round
        if (gametype === '1+H' && fascistScore === 3) {
            broadcastData(data, false, president);
            data.cards = nextThree();
            emitData(data, president);
            setTimeout(nextRound, 3000);
        }
        // executive phase for all other powers
        else if (fascistScore >= 4 || (gametype === '3+H') ||
        (gametype == '2+H' && fascistScore >= 2)) {
            phase = 'executive';
            broadcastData(data);
        // broadcast the policy enaction and proceed to next round otherwise
        } else {
            broadcastData(data);
            setTimeout(nextRound, 3000);
        }
    };

    var nextThree = function() {
        var cards = [];
        for (var i = 0; i < 3; i++) {
            cards.push(deck[deckPointer + i]);
        }
        return cards;
    };

    var executePower = function(target) {
        var data = {};
        data.target = target;

        if (fascistScore >= 4) {
            if (players[target].hitler) {
                matchEnd('hitler killed');
                return;
            }
            players[target].killed = true;
            players[target].status = 'spectating';
            playersIndex.splice(playersIndex.indexOf(target), 1);
            data.type = 'execution';
            broadcastData(data);

            setTimeout(nextRound, 3000);
        } else if (fascistScore === 3) {
            data.type = 'special election';
            broadcastData(data);
            setTimeout(function () {
                specialElection = true;
                nextPresident = (president + 1) % 9;
                startElection(data.target);
            }, 3000);
        } else {
            data.type = 'player investigated';
            broadcastData(data, false, president);
            data.info = players[target].fascist;
            emitData(data, president);
            setTimeout(nextRound, 3000);
        }
    };


    // process incoming data from a peer
    var processData = function(data) {
        var readyPlayers;
        var numberReady;
        var readyData;
        console.log(stateData());
        console.log(data);
        // take action depending on data type
        switch (data.type) {
            // chat message data, broadcast if silence is not applied
            case 'chat message':
                if (data.content) {
                    var chatData = {};
                    chatData.author = data.username;
                    chatData.content = data.content;
                    chatData.timeStamp = new Date();
                    chatData.type = 'chat message';

                    // players can only transmit chat messages during pregame and during non-silent period,
                    // broadcasts to everyone
                    if ((phase === 'pre-game' || peers[data.slot].player.status !== 'spectating') && !silence) {
                        broadcastData(chatData);
                    //spectators broadcast to other spectators only
                    } else {
                        broadcastData(chatData, true);
                    }
                }
                break;
            // full request for the state of the game (typically requested on first join)
            // respond with data
            case 'state request':
                emitState(data.slot);
                break;
            // request to start match
            case 'start match request':
                if (data.slot === 0) { //check if host
                    console.log('match request');

                    //check number of players ready
                    readyPlayers = getReadyPlayers();
                    numberReady = readyPlayers.length;
                    console.log(numberReady + ' players ready');
                    console.log(readyPlayers);
                    if (numberReady >= 5 && numberReady <= 10) {
                        open = false;
                        network.masterEmit('close room');
                        startGame(readyPlayers);
                    }
                }
                break;
            case 'ready request':
                //pre-game
                if (phase === 'pre-game') {
                    if (peers[data.slot].player.status === 'spectating') {
                        peers[data.slot].player.status = 'ready';
                        broadcastPlayerReady(data.slot);
                    }
                // starting phase
                } else if (phase === 'starting') {
                    if (peers[data.slot].player.status === 'pending') {
                        peers[data.slot].player.status = 'ready';
                        // if all players are ready, start the first election with a randomly chosen president
                        if (allPlayersReady()) {
                            //switchPlayersStatus('ready', '');
                            startElection(randomInteger(0, 9));
                        } else {
                            broadcastPlayerReady(data.slot);
                        }
                    }
                // pre-vote phase
            } else if (phase === 'election 2') {
                    console.log(players);
                    console.log(peers);
                    if (peers[data.slot].player.status === 'pending') {
                        peers[data.slot].player.status = 'ready';
                        if (allPlayersReady()) {
                            startCandidateVote();
                        } else {
                            broadcastPlayerReady(data.slot);
                        }
                    }
                }
                break;
            case 'chancellor selection':
                console.log(players);
                if (phase === 'election 1' && president === data.slot) {
                    console.log(data);
                    if (!players[data.candidate].limited) {
                        console.log('reached');
                        candidateVoteSetup(data.candidate);
                    }
                }
                break;
            case 'vote request':
                if (phase === 'election 3' && players[data.slot] !== 'voted' && !players[data.slot].killed) {
                    players[data.slot].status = 'voted';
                    if (data.vote) {
                        players[playersIndex[data.slot]].lastVote = true;
                        yesVotes++;
                    } else {
                        players[playersIndex[data.slot]].lastVote = false;
                        noVotes++;
                    }
                } else if (phase === 'legislation veto' && data.slot === president && fascistScore === 6) {
                    if (data.vote) {
                        veto();
                    } else {
                        console.log('veto failed');
                        phase = 'legislation 3b';

                        broadcastData({type: 'veto failed'});
                    }
                }
                break;
            case 'draw request':
                console.log(phase);
                if (phase === 'legislation 1' && data.slot === president) {
                    phase = 'legislation 2';
                    silence = true;
                    drawCards();
                    // emit drawn cards to the president drawing
                    emitData({type: '3 drawn', drawnCards: drawnCards}, president);

                    // broadcast that the president has drawn cards to everyone else (exclude drawer)
                    broadcastData({type: 'president drew'}, false, president);
                }
                break;
            case 'policy select request':
                console.log(data);
                console.log(drawnCards);
                if (phase === 'legislation 2' && data.slot === president) {
                    phase = 'legislation 3';
                    discardCard(data.handIndex);

                    // emit the 2 remaining policies to the chancellor
                    emitData({type: '2 given', drawnCards: drawnCards}, chancellor);

                    // broadcast that the chancellor has been handed 2 policies by the president
                    broadcastData({type: 'chancellor given'}, false, chancellor);
                    
                }else if ((phase === 'legislation 3' || phase === 'legislation 3b') && data.slot === chancellor) {
                    enactPolicy(data.handIndex);
                }
                break;
            case 'veto request':
                if (phase === 'legislation 3' && data.slot === chancellor) {
                    phase = 'legislation veto';
                    // broadcast that the chancellor has requested a veto
                    broadcastData({type: 'veto requested'});
                }
                break;
            case 'target request':
                if (phase === 'executive' && data.slot === president) {
                    if (playersIndex.indexOf(data.candidate) !== -1) {
                        console.log('reached');
                        executePower(data.candidate);
                    }
                }
        }
    };

    var host = {};

    // initialize hosting
    host.init = function(data, maxCapacity, peer) {
        open = false;
        name = data.name;
        capacity = Math.max(Math.min(Math.floor(maxCapacity), 10), 5); // valid values: 5 to 10
        peers = new Array(capacity);
        connected = 0;

        resetGame();
        setPlayers();
        occupancy = 1;
        network.masterEmit('create room');
        
        // room created successfully, open room and add self to room
        document.addEventListener("onRoomCreation", function(e) {
            if (!open) {
                open = true;
                peer.username = e.detail.username;
                addToPeers(peer);
                peer.player.status = 'host pending';
                document.dispatchEvent(new Event("onRoomOpen"));
            }
        });
    };


    return host;

}(NETWORK));
