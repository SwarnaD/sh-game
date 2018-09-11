var STATES = (function(states, network, ui) {
    'use strict';

    states.play = (function() {
        var game;

        // indext of this player in the players list
        var slot;

        // state info
        var phase;
        var deckPointer;
        var electionTracker;
        var players;
        var liberalScore;
        var fascistScore;
        var president; // current president/candidate
        var chancellor; // current chancellor/candidate
        var gametype;
        var username;

        // ui
        var messages;
        var chat_form;
        var chat_input;
        var lobbyPlayers;

        var gameLogo;

        var readyBtn;
        var startMatchBtn;
        var exitBtn;

        // listeners
        document.addEventListener("onPeerData", function(e) {
            processData(e.detail);
        });

        document.addEventListener("onPeerClose", function() {
            ui.createServerMessage('Connection to host closed.');
            setTimeout(goToMenu, 3000);
        });

        // chat submission
        document.getElementById("chat_form").onsubmit = function (e) {
            //prevent default refresh
            e.preventDefault();
            if (chat_input.value) {
                var data = {};
                data.type = 'chat message';
                data.content = chat_input.value;
                network.sendPeer(data);
                document.getElementById("chat_form").reset();
            }
        };

        document.getElementById('exit').onclick = function () {
            document.getElementById('chat_form').style.display = 'none';
            game.state.start('menu');
        };

        // state of game as an object, for debugging
        var getState = function() {
            var data = {};
            data.slot = slot;
            data.phase = phase;
            data.deckPointer = deckPointer;
            data.electionTracker = electionTracker;
            data.players = players;
            data.liberalScore = liberalScore;
            data.fascistScore = fascistScore;
            data.president = president;
            data.chancellor = chancellor;
            return data;
        };

        var updateState = function(data) {
            phase = data.phase;
            gametype = data.gametype;
            deckPointer = data.deckPointer;
            electionTracker = data.electionTracker;
            liberalScore = data.liberalScore;
            fascistScore = data.fascistScore;
            players = data.players;
            president = data.president;
            chancellor = data.chancellor;

            // give access to start match button if host, ready button if client during pre-game
            // if (phase === 'pre-game' && slot === 0) startMatchBtn.style.display = 'inline-block';
            // else if (phase === 'pre-game') readyBtn.style.display = 'inline-block';
        };

        var updatePlayer = function(data, pregame) {
            // if pre-game or player doesn't yet exist, initiate new player
            if (pregame || !players[data.slot]) {
                players[data.slot] = {};
                players[data.slot].slot = data.slot;
            // otherwise soft update (may want to keep secret information)
            } 
            players[data.slot].username = data.username;
            players[data.slot].status = data.status;
            players[data.slot].investigated = data.investigated;
            players[data.slot].killed = data.killed;
            players[data.slot].limited = data.limited;
            players[data.slot].lastVote = data.lastVote;
            
        };


        // clear all limits
        var clearLimits = function() {
            for (var i = 0; i < players.length; i++) {
                if (players[i]) {
                    players[i].limited = false;
                }
            }
        };

        // set all players (non-spectators) status to a specific status
        var setAllPlayersStatus = function(status) {
            for (var i = 0; i < players.length; i++) {
                if (players[i]) {
                    if (players[i].status !== 'spectating' & players[i].status !== 'not present' && !players[i].killed) {
                        players[i].status = status;
                    }
                }
            }
        };

        // election failed, progress election tracker, top-deck if 3 elections in a row
        // failed and reshuffle deck if applicable
        var electionFailed = function(data) {
            electionTracker++;
            ui.setElectionTracker(electionTracker + 1);
            if (electionTracker === 3) {
                electionTracker = 0;
                ui.setElectionTracker(electionTracker + 1);
                clearLimits();
                //next round, anyone can be chancellor
                ui.createServerMessage('3 votes in a row have failed, top decking a policy...');

                
                if (data.policy) {
                    fascistScore++;
                    ui.placeFascistPolicy(fascistScore, game);
                    ui.createServerMessage('Fascist policy enacted!');
                    fascistScoreCheck();
                } else {
                    liberalScore++;
                    ui.placeLiberalPolicy(liberalScore, game);
                    ui.createServerMessage('Liberal policy enacted!');
                }

                if (data.reshuffled) {
                    ui.createServerMessage('Deck has been reshuffled.');
                }
            }
        };

        var fascistScoreCheck = function() {
            if (fascistScore === 3) {
                ui.createServerMessage('ATTENTION: If hitler is elected as chancellor, fascists will win!');
            }
            if (fascistScore === 5) {
                ui.createServerMessage('ATTENTION: Veto power is now active starting from the next legislation!');
            }
        };
        
        var processData = function(data) {
            var message;
            console.log(getState());
            switch (data.type) {
                case 'chat message':
                    ui.createMessage(data);
                    break;
                case 'state':
                    slot = data.ownSlot;
                    username = data.players[slot].username;
                    updateState(data);
                    console.log('state update');
                    console.log(getState());

                    // graphical changes
                    ui.showPlayerUI();
                    for (var i = 0; i < data.players.length; i++) {
                        if (data.players[i]) {
                            if (i === slot) ui.createPlayerPanel(data.players[i].username, true);
                            else ui.createPlayerPanel(data.players[i].username);

                            if (i === 0) {
                                ui.placeLobbySprite(game, data.players[i].username, true);
                                ui.addStatus(data.players[i].username, 'ready');
                            } else ui.placeLobbySprite(game, data.players[i].username);
                        } else break;
                    }

                    // show start button for host, show ready button for peers
                    if (phase === 'pre-game' && slot === 0) ui.showStartBtn();
                    else if (phase === 'pre-game') ui.showReadyBtn();

                    break;
                case 'player joined':
                    updatePlayer(data, status === 'pre-game');
                    message = data.username + ' joined the room.';
                    ui.createServerMessage(message);
                    console.log(message);
                    console.log(getState());

                    // graphical changes here
                    ui.createPlayerPanel(data.username);
                    ui.placeLobbySprite(game, data.username);

                    break;
                case 'player left':
                    players[data.content].status = 'not present';
                    message = players[data.content].username + ' has left the room.';
                    ui.createServerMessage(message);
                    console.log(message);
                    console.log(getState());

                    // graphical changes here
                    ui.removePlayerPanel(players[data.content].username);
                    ui.destroyLobbySprite(players[data.content].username);

                    if (phase !== 'pre-game') {
                        ui.createServerMessage('Exiting to main menu...');
                        setTimeout(exit, 3000);
                    }

                    break;
                case 'begin state':
                    updateState(data);
                    console.log('current slot is ' + slot);

                    // ui changes
                    ui.createServerMessage('Game has started!');
                    ui.showBoards(game, gameLogo, gametype);
                    ui.removeAllStatuses();
                    if (players[slot].hitler) {
                        ui.createServerMessage('You are Hitler! Work with your fellow fascists to elect Hitler!', '#ffa500');
                        ui.revealRoleSprite(players[slot].username, 'hitler');
                        if (gametype === '1+H') {
                            for (var i = 0; i < players.length; i++) {
                                if (players[i]) {
                                    if (players[i].fascist && slot !== i) ui.revealAllies(players[i].username, 'fascist');
                                }
                            }
                        }
                    } else if (players[slot].fascist) {
                        ui.createServerMessage('You are a fascist! Work with other fascist and Hitler to elect him!', '#ffa500');
                        ui.revealRoleSprite(players[slot].username, 'fascist');
                        for (var i = 0; i < players.length; i++) {
                            if (players[i]) {
                                if (players[i].hitler && slot != i) ui.revealAllies(players[i].username, 'hitler');
                                else if (players[i].fascist && slot != i) ui.revealAllies(players[i].username, 'fascist');
                            }
                        }
                    } else if (players[slot].status === 'pending') {
                        ui.createServerMessage('You are a liberal!', '#00bfff');
                        ui.createServerMessage('Either!', '#00bfff');
                        ui.revealRoleSprite(players[slot].username, 'liberal');
                    } else {
                        console.log('You are not playing, just spectating');
                    }

                    // show ready button again to signal player is ready for next phase
                    if (players[slot].status === 'pending') {
                        ui.createServerMessage('Please ready up to start the game', '#008000');
                    }
                    ui.hideStartBtn();
                    ui.showReadyBtn();

                    console.log(getState());

                    break;
                case 'player ready': // a player has readied up
                    players[data.playerIndex].status = 'ready';
                    console.log(getState());

                    ui.addStatus(players[data.playerIndex].username, 'ready');

                    // graphical changes here
                    if (slot === data.playerIndex) {
                        ui.createServerMessage('You are ready', '#008000');
                    } else ui.createServerMessage(players[data.playerIndex].username + ' is ready', '#008000');

                    break;
                // a new round has begun, the next presidential candidate is choosing
                // their president
                // data.candidate = slot # of the new presidential candidate
                case 'new candidate':
                    phase = 'election 1';
                    president = data.candidate;
                    setAllPlayersStatus('waiting');
                    players[data.candidate].status = 'choosing chancellor';

                    ui.removeAllStatuses();

                    if (slot === data.candidate) {
                        
                        ui.createServerMessage('You are the president! You must pick another player to be your chancellor!', '#00bfff');
                        var limitedUsernames = getLimitedUsernames();
                        var killedUsernames = getKilledUsernames();
                        var exclusions = limitedUsernames.concat(killedUsernames);
                        exclusions.push(players[slot].username);
                        ui.allowPlayerSelection(exclusions, game);

                        // allow this  player to pick a chancellor and submit data with network.sendPeer(data)
                        // data.type = 'start candidate vote'
                        // data.candidate = slot # of chancellor the player chooses
                    } else {
                        ui.createServerMessage(players[data.candidate].username + ' is running for office! They must select a chancellor for you to proceed.', '#00bfff');
                        //these players wait
                    }

                    ui.enableAllPlayers();
                    getLimitedUsernames().map(function (username) {ui.disablePlayer(username);});
                    ui.addStatus(players[data.candidate].username, 'president');

                    break;

                // chancellor chosen, all players must now ready up to start the voting
                case 'pre-vote':
                    phase = 'election 2';
                    chancellor = data.candidate;
                    setAllPlayersStatus('pending');

                    if (slot === data.candidate) {
                        ui.createServerMessage('You have been selected to be the Chancellor!', '#ffa500');
                    } else {
                        ui.createServerMessage(players[data.candidate].username + ' has been selected to be the Chancellor!', '#ffa500');
                    }

                    ui.addStatus(players[data.candidate].username, 'chancellor');

                    if (!players[slot].killed) {
                        ui.createServerMessage('Please ready up to start voting', '#008000');
                        ui.showReadyBtn();
                    }

                    break;

                // vote started, players have 10s to vote (automatic no if they dont choose anything)
                case 'vote start':
                    phase = 'election 3';
                    setAllPlayersStatus('voting');

                    if (!players[slot].killed) {
                        ui.createServerMessage('You have 5 seconds to vote!');
                        ui.showVoteOptions(game);
                        ui.hideReadyBtn();
                    }

                    console.log(players);
                    for (var i = 0; i < players.length; i++) {
                        if (players[i]) {
                            console.log(players[i]);
                            ui.removeStatus(players[i].username, 'ready');
                        }
                    }

                    // show vote controls (everyone votes)
                    // send the result like this network.sendPeer(data)
                    // data.type = 'vote request'
                    // data.vote = true/false for yes/no

                    // show a TIMER, 10s, automatically send a no vote if they dont respond in time

                    // on the host side, will wait 15s for a response and treat it as a no vote if no response in that time frame,
                    // (even if no default timer vote)
                    // then next phase data will be sent to all clients
                    break;
    
                // vote ended, update variables based on result, show messages to user about the result, etc.
                // data.elected = boolean for if vote passed or not
                // the rest of these properties are only present when the vote failed (not present if false as well)
                // data.policy = true => fascist policy was top decked and enacted, false for liberal
                // data.reshuffled => only present (true) if deck was reshuffle, just for notifying player
                // data.votes
                case 'vote end':
                    console.log(data);
                    ui.createServerMessage('Election has passed:');
                    for (var i = 0; i < data.votes.length; i++) {
                        if (data.votes[i]) ui.createServerMessage(players[i].username + ' voted YES');
                        else if (data.votes[i] === false) ui.createServerMessage(players[i].username + ' voted NO');
                    }
                    if (data.elected) {
                        ui.createServerMessage('Majority voted YES, ' + players[president].username + ' is now President and ' +  players[chancellor].username + ' is their Chancellor');
                        // set new restrictions for next chancellor candidate
                        // these restrictions dictate who can't be chosen as chancellor for next round
                        clearLimits();
                        if (gametype === '2+H' || gametype === '3+H') {
                            players[president].limited = true;
                        }
                        players[chancellor].limited = true;

                        console.log('vote passed');
                    } else {
                        console.log('vote failed');
                        ui.createServerMessage('Majority voted NO, a new election will be held');

                        // election failed
                        electionFailed(data);
                    }

                    break;
                // after a vote passes, everyone waits for the president to draw 3 policy cards
                // no extra information sent here
                case 'pre-policy draw':
                    phase = 'legislation 1';
                    setAllPlayersStatus('waiting');

                    if (slot !== president) {
                        console.log('President must now draw 3 cards. As soon as they do, communication will be forbidden.');
                        ui.createServerMessage('President must now draw 3 cards. As soon as they do, communication will be forbidden.');
                    } else {
                        console.log('You must draw from the deck. No communication will be allowed after you draw.');
                        ui.createServerMessage('You must draw from the draw pile deck and discard one policy. No communication will be allowed after you draw.', '#00bfff');

                        ui.enableDraw(game);

                        // show controls for drawing from the deck for this player (the president)
                        // the control should signal that they are drawing 3 cards with the field 'draw request' like this
                        // network.sendPeer({type: 'draw request'});
                    }
                    break;
                // this player is the president and just drew 3 cards
                case '3 drawn':
                    phase = 'legislation 2';

                    if (players[slot].status !== 'spectating') {
                        chat_input.disabled = true;
                    }

                    console.log(data);
                    // data.drawnCards is an array of 3 booleans, true corresponds to a fascist policy, false for liberal

                    ui.showThreePolicies(data.drawnCards, game);
                    ui.createServerMessage('Please DISCARD a policy. The other 2 will be passed to the chancellor.', '#00bfff');

                    // display the 3 cards and let the president discard 1 of them, the remaining 2 will go to chancellor

                    // send the DISCARDED CHOICE data with these fields:
                    // type: 'discard request'
                    // discardIndex: the index number (not value!) of the discarded card in the hand which is either 0, 1 or 2
                    break;
                // this player is not the president, but the president just drew 3 cards
                case 'president drew':
                    phase = 'legislation 2';

                    if (players[slot].status !== 'spectating') {
                        chat_input.disabled = true;
                    }

                    console.log(data);

                    ui.createServerMessage('The president drew 3 cards from the deck!');
                    break;
                // this player is the chancellor and was given the 2 remaining cards by the president, they must pick one of the 2
                // policies to enact or if the veto power is active they can request a veto
                case '2 given':
                    phase = 'legislation 3';
                    console.log(data);

                    // if veto power is active (5 fascist policies already on board), show an option to send a veto request
                    // send a veto request with an object like this {type: 'veto request'}
                    if (fascistScore === 5) {
                        ui.showVeto(game);
                        ui.createServerMessage('Please ENACT policy. You may also opt to request a veto on this enaction.');
                    } else {
                        ui.createServerMessage('Please ENACT policy.');
                    }

                    ui.showThreePolicies(data.drawnCards, game);
                    ui.placeDiscardSprite(game);

                    // data.drawnCards is an array of 2 booleans, true corresponds to a fascist policy, false for liberal
                    // it's the remaining 2 cards

                    // display the 2 cards and let the chancellor choose 1 of them to enact the policy

                    // send the card choice with this data
                    // type: 'enact request'
                    // enactIndex: the index number (not value!) of card in the hand to enact, either 0 or 1


                    // in summary, can choose 1 of 2 cards or a veto option if applicable
                    break;
                // this goes to all non-chancellor players to show chancellor has just been given 2 cards
                case 'chancellor given':
                    phase = 'legislation 3';
                    console.log(data);

                    ui.createServerMessage('The president handed over 2 policies to the chancellor!');
                    ui.placeDiscardSprite(game);

                    // nothing much here, just let player know chancellor was given 2 cards, player just waits
                    break;
                //the chancellor is requesting a veto
                case 'veto requested':
                    phase = 'legislation veto';
                    console.log(data);
                    if (slot === president) {
                        console.log('Chancellor wishes to veto, do you accept the veto?');
                        ui.showVoteOptions(game, true);
                        ui.createServerMessage('Chancellor wishes to veto, do you accept the veto?', '#00bfff');
                        //show president controls to agree or deny the veto vote
                        //probably can use same controls as the yes/no voting

                        //send data the same way as the vote data
                        // {type: 'vote request', vote: true/false}
                    } else {
                        ui.createServerMessage('The chancellor wishes to veto, waiting on president for the reply.');
                        console.log('The chancellor wishes to veto, waiting on president for the reply.');
                    }
                    break;
                //the president has agreed to the veto
                case 'veto passed':
                    console.log(data);
                    console.log('Veto passed, all drawn policies discarded.');
                    ui.destroyThreePolicies();
                    ui.createServerMessage('Veto passed, all drawn policies discarded');

                    // election failed
                    electionFailed(data);

                    chat_input.disabled = false;
                    ui.createServerMessage('Communication re-enabled!');
                    break;
                // veto failed, chancellor still has to pick a policy
                case 'veto failed':
                    console.log(data);
                    phase = 'legislation 3b'; // same as legislation 3, but no option to veto

                    if (slot === chancellor) {
                        console.log('Veto failed, you must enact a policy!.');
                        ui.createServerMessage('Veto failed, you must enact a policy!.', '#ffa500');
                        ui.visibilityThreePolicies(true);
                        //chancellor still has to pick a policy, show the 2 policies again (still stored in cardsDrawn)
                        // send data again like in case '2 given' except no veto option
                    } else {
                        console.log('Veto failed, chancellor must enact a policy.');
                        ui.createServerMessage('Veto failed, chancellor must enact a policy.');
                        //other players just wait
                    }

                    break;
                // a policy has been played by the chancellor
                case 'policy enacted':
                    if (data.policy) { //fascist policy
                        fascistScore++;
                        ui.placeFascistPolicy(fascistScore, game);
                        ui.createServerMessage('A fascist policy has been played');
                        fascistScoreCheck();
                        if (data.reshuffled) {
                            ui.removeDiscardSprite();
                            ui.createServerMessage('The deck has been reshuffled.');
                        }
                        if (gametype === '1+H' && fascistScore === 3) {
                            if (slot === president) {
                                ui.createServerMessage('Here are the next 3 policies:', '#00bfff');
                                // data.cards is an array of 3 cards the president can see
                                ui.createServerMessage('You peeked at the next 3 cards in the deck:');
                                for (var i = 0; i < data.cards.length; i++) {
                                    if (data.cards[i]) ui.createServerMessage('FASCIST', '#00bfff');
                                    else ui.createServerMessage('LIBERAL', '#ffa500');
                                }
                            } else {
                                ui.createServerMessage('The president has seen the next 3 policies in the deck!', '#00bfff');
                            }
                        } else { // resolve the rest of the fascist powers
                            resolveFascistPowers();
                        }
                    } else { //liberal policy
                        liberalScore++;
                        ui.placeLiberalPolicy(liberalScore, game);
                        ui.createServerMessage('A liberal policy has been played');
                        //display message and just wait
                    }

                    chat_input.disabled = false;
                    ui.createServerMessage('Communication re-enabled!');
                    break;
                // president executed a player
                case 'execution':
                    console.log(data);
                    players[data.target].killed = true;
                    players[data.target].status = 'spectating';

                    console.log(players[data.target].username + ' was executed!');
                    ui.disablePlayer(players[data.target].username, true);
                    ui.createServerMessage(players[data.target].username + ' was executed!');

                    // indicate executed player
                    //'new candidate event comiong in shortly
                    break;
                case 'special election':
                    console.log(data);
                    ui.createServerMessage(players[data.target].username + ' was chosen to be the next presidential candidate!');

                    // 'new candidate' event coming in shortly
                    break;
                case 'player investigated':
                    console.log(data);
                    ui.createServerMessage(players[data.target].username + ' was investigated by the president!');

                    if (slot === president) {
                        players[data.target].fascist = data.info;
                        if (data.info === false) {
                            ui.createServerMessage(players[data.target].username + ' is a liberal!');
                            ui.investigatePlayer(players[data.target], 'liberal');
                        } else if (data.info === true) {
                            ui.createServerMessage(players[data.target].username + ' is a fascist!');
                            ui.investigatePlayer(players[data.target], 'fascist');
                        }
                    }
                    // 'new candidate' event coming in shortly
                    break;
                case 'match end':
                    revealTeams(data.hitler, data.fascists);
                    switch (data.wintype) {
                        case 'liberal policies':
                            liberalScore++;
                            ui.placeLiberalPolicy(liberalScore, game);
                            ui.createServerMessage('Liberals win!');
                            break;
                        case 'fascist policies':
                            fascistScore++;
                            ui.placeFascistPolicy(fascistScore, game);
                            ui.createServerMessage('Fascists win!');
                            break;
                        case 'hitler killed':
                            ui.createServerMessage('Hitler was killed, liberal win!');
                            break;
                        case 'hitler in power':
                            ui.createServerMessage('Hitler is chancellor and has too much influence, fascists win!');
                            break;
                        case 'top deck liberal policies':
                            liberalScore++;
                            ui.placeLiberalPolicy(liberalScore, game);
                            ui.createServerMessage('Top decked a liberal policy, liberals win!');
                            break;
                        case 'top deck fascist policies':
                            liberalScore++;
                            ui.placeLiberalPolicy(liberalScore, game);
                            ui.createServerMessage('Top decked a liberal policy, fascists win!');
                            break;
                    }

                    ui.createServerMessage('Exiting to main menu...');
                    setTimeout(exit, 3000); 
                    
                    break;

            }
        };


        var revealTeams = function(hitler, fascists) {
            var fascistsUsernames = [];
            for (var i = 0; i < fascists.length; i++) {
                if (hitler === fascists[i]) {
                    ui.createServerMessage(players[fascists[i]].username + ' was Hitler!');
                } else {
                    fascistsUsernames.push(players[fascists[i]].username);
                    ui.createServerMessage(players[fascists[i]].username + ' was a fascist!');
                }
            }
            ui.revealAllRoles(players[hitler].username, fascistsUsernames);
        };


        var resolveFascistPowers = function() {
            switch (fascistScore) {
                case 1:
                    if (gametype === '3+H') executivePhase(0);
                    break;
                case 2:
                    if (gametype !== '1+H') executivePhase(0);
                    break;
                case 3:
                    if (gametype !== '1+H') executivePhase(1);
                    break;
                case 4:
                    executivePhase(3);
                    break;
                case 5:
                    executivePhase(3);
                    break;
            }
        };

        var executivePhase = function(power) {
            //0 - investigated
            //1 - special election
            //3 - execution

            phase = 'executive';

            switch (power) {
                case 0:
                    ui.createServerMessage('The president must now investigate someone.');
                    break;
                case 1:
                    ui.createServerMessage('The president must now select the next presidential candidate!');
                    break;
                case 3:
                    ui.createServerMessage('The president must now execute someone!');
                    break;
            }

            if (slot === president) {
                ui.createServerMessage('Please choose a player.');

                var exclusions = getKilledUsernames();
                exclusions.push(players[slot].username);
                ui.allowPlayerSelection(exclusions, game, true);
                //allow player to select a player, send object with fields
                //type: target request
                //slot: the index of the targeted player
            }
        };

        var goToMenu = function() {
            game.state.start('menu');
        };
    
        var exit = function() {
            ui.clearPlayerSprites();
            // hide all relevant html elements here
            ui.removePlayerUI();
            //close peer connection, go back to main menu
            network.closePeer(goToMenu);
        };

        var readyUp = function() {
            console.log('sending ready request');
            var data = {};
            data.type = 'ready request';
            ui.hideReadyBtn();
            network.sendPeer(data);
        };

        var startMatch = function() {
            var data = {};
            data.type = 'start match request';
            network.sendPeer(data);
        };

        var requestState = function() {
            var data = {};
            data.type = 'state request';
            network.sendPeer(data);
        };

        var getLimitedUsernames = function() {
            var usernames = [];
            for (var i = 0; i < 10; i++) {
                if (players[i]) {
                    if (players[i].limited) {
                        usernames.push(players[i].username);
                    }
                }
            }
            return usernames;
        };

        var getKilledUsernames = function() {
            var usernames = [];
            for (var i = 0; i < 10; i++) {
                if (players[i]) {
                    if (players[i].killed) {
                        usernames.push(players[i].username);
                    }
                }
            }
            return usernames;
        };

        var play = {};

        play.init = function() {
            chat_form = document.getElementById('chat_form');
            messages = document.getElementById('messages');
            lobbyPlayers = document.getElementById('lobby_players');
            chat_input = document.getElementById('chat_input');
            startMatchBtn = document.getElementById('start');
            readyBtn = document.getElementById('ready');
            exitBtn = document.getElementById('exit');

            //listeners
            startMatchBtn.onclick = startMatch;
            readyBtn.onclick = readyUp;
            exitBtn.onclick = exit;
        };

        play.create = function() {
            // save game variable
            game = this;

            // remove all objects associated with the load state
            this.world.removeAll();

            gameLogo = this.add.sprite(this.world.centerX + 90, 175, 'secret_hitler_logo');
            gameLogo.anchor.set(0.5);

            chat_form.style.display = 'flex';

            exitBtn.style.display = 'inline-block';

            console.log(players);

            requestState();
        };

        play.update = function() {
        };


        return play;

    }());

    return states;

}(STATES || {}, NETWORK, UI));


