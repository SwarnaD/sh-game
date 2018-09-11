var UI = (function (network) {
    'use strict';

    var liberalBoardSprite;
    var fascistBoardSprite;
    var drawPileSprite;
    var discardPileSprite;
    var yesCardSprite;
    var noCardSprite;
    var policySprite;
    var electionTrackerSprite;
    var discardSprite;
    var playerSprites = [];
    var allPolicies = [];
    var threePolicies = [];

    var fontStyle = { font: "1.2rem Serif", fill: "#060809", align: "center" };


    var playerUI = document.getElementById('player_ui');
    var messages = document.getElementById('messages');
    var lobbyPlayers = document.getElementById('lobby_players');
    var startBtn = document.getElementById('start');
    var readyBtn = document.getElementById('ready');


    var ui ={};

    ui.createMessage = function (data) {
        var message = document.createElement('div');
        message.innerHTML = data.author + ': ' + data.content;
        message.style.padding = '5px 0';
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
    };

    ui.createServerMessage = function (message, color = "#ee682a") {
        var serverMessage = document.createElement('div');
        serverMessage.innerHTML = message;
        serverMessage.style.color = color;
        serverMessage.style.padding = '5px 0';
        messages.appendChild(serverMessage);
        messages.scrollTop = messages.scrollHeight;
    };

    ui.createPlayerPanel = function (username, own = false) {
        var panel = document.createElement('div');
        panel.id = username;
        panel.innerHTML = username;
        panel.classList.add('player_panel');
        if (own) panel.style.color = '#ee682a';
        lobbyPlayers.appendChild(panel);
    };

    ui.addStatus = function (username, statusName) {
        var status = document.createElement('div');
        status.id = username + '_' + statusName;
        status.classList.add('status');
        status.classList.add(statusName);
        document.getElementById(username).appendChild(status);
    };

    ui.removeStatus = function (username, statusName) {
        var status = document.getElementById(username + '_' + statusName);
        if (status) {
            status.parentNode.removeChild(status);
        }
    };

    ui.removeAllStatuses = function () {
        var statuses = document.getElementsByClassName('status');
        while(statuses.length > 0){
            statuses[0].parentNode.removeChild(statuses[0]);
        }
    };

    ui.removePlayerPanel = function (username) {
        var panel = document.getElementById(username);
        panel.parentNode.removeChild(panel);
    };

    ui.showPlayerUI = function () {
        playerUI.style.display = 'flex';
    };

    ui.hidePlayerUI = function () {
        playerUI.style.display = 'none';
    };

    ui.removePlayerUI = function () {
        while (messages.firstChild) {
            messages.removeChild(messages.firstChild);
        }
        while (lobbyPlayers.firstChild) {
            lobbyPlayers.removeChild(lobbyPlayers.firstChild);
        }
        playerUI.style.display = 'none';
    };

    ui.setElectionTracker = function (position) {
        electionTrackerSprite.x = 835 + (position * 98.5);
    };

    ui.placeLobbySprite = function (game, username, isHost = false) {
        var group = [];
        var spriteGroup = game.add.group();
        var sprite;
        var text;

        if (isHost) {
            sprite = game.add.sprite(375, 375, 'cards', 5);
            text = game.add.text(0, 0, username, fontStyle);
            text.alignTo(sprite, Phaser.BOTTOM_CENTER);
        } else {
            sprite = game.add.sprite(0, 0, 'cards', 5);
            sprite.alignTo(playerSprites[playerSprites.length - 1][1].children[0], Phaser.RIGHT_CENTER, 16);
            text = game.add.text(0, 0, username, fontStyle);
            text.alignTo(sprite, Phaser.BOTTOM_CENTER);
        }

        sprite.data = playerSprites.length;
        spriteGroup.add(sprite);
        spriteGroup.add(text);
        group.push(username);
        group.push(spriteGroup);
        playerSprites.push(group);
    };

    ui.destroyLobbySprite = function (username) {
        for (var i = 0; i < playerSprites.length; i++) {
            if (playerSprites[i][0] === username) {
                playerSprites[i][1].destroy();
                playerSprites.splice(i, 1);
                console.log(playerSprites);
                // organize the lobby
                if (playerSprites.length > 1) organizeLobby();
                return;
            }
        }
    };

    ui.clearPlayerSprites = function () {
        playerSprites = [];
    };

    ui.revealRoleSprite = function (username, role) {
        for (var i = 0; i < playerSprites.length; i++) {
            var spriteGroup = playerSprites[i][1];
            spriteGroup.y += 375;
            if (playerSprites[i][0] === username) {
                switch (role) {
                    case 'hitler':
                        spriteGroup.children[0].loadTexture('cards', 3);
                        break;
                    case 'fascist':
                        spriteGroup.children[0].loadTexture('cards', 2);
                        break;
                    case 'liberal':
                        spriteGroup.children[0].loadTexture('cards', 8);
                        break;
                }
            }
        }
    };

    ui.revealAllies = function (username, role) {
        for (var i = 0; i < playerSprites.length; i++) {
            var spriteGroup = playerSprites[i][1];
            if (playerSprites[i][0] === username) {
                switch (role) {
                    case 'hitler':
                        spriteGroup.children[0].loadTexture('cards', 3);
                        break;
                    case 'fascist':
                        spriteGroup.children[0].loadTexture('cards', 2);
                        break;
                }

                break;
            }
        }
    };

    ui.showBoards = function (game, gameLogo, gameType) {
        gameLogo.destroy();

        switch (gameType) {
            case '1+H':
                fascistBoardSprite = game.add.sprite(600, 375, 'fascist_board');
                break;
            case '2+H':
                fascistBoardSprite = game.add.sprite(600, 375, 'fascist_board_7-8');
                break;
            case '3+H':
                fascistBoardSprite = game.add.sprite(600, 375, 'fascist_board_9-10');
                break;
        }

        liberalBoardSprite = game.add.sprite(600, 25, 'liberal_board');
        drawPileSprite = game.add.sprite(350, 37.5, 'cards_210x300', 1);
        discardPileSprite = game.add.sprite(1640, 37.5, 'cards_210x300', 0);
        policySprite = game.add.sprite(375, 58, 'policy');
        electionTrackerSprite = game.add.sprite(932, 302, 'election_tracker');
    };

    ui.allowPlayerSelection = function (exclusions, game, powerTarget) {
        console.log(exclusions);
        console.log(powerTarget);
        var sprite;
        for (var i = 0; i < playerSprites.length; i++) {
            sprite = playerSprites[i][1].children[0];
            sprite.alpha = 1.0;
            if (exclusions.indexOf(playerSprites[i][0]) === -1) {
                sprite.inputEnabled = true;
                if (powerTarget) {
                    sprite.events.onInputDown.add(chooseTarget, game);
                    addGraphicEvents(sprite, game);
                } else {
                    sprite.events.onInputDown.add(chooseCandidate, game);
                    addGraphicEvents(sprite, game);
                }
            }
        }
    };

    ui.revealAllRoles = function (hitler, fascists) {
        for (var i = 0; playerSprites.length; i++) {
            var sprite = playerSprites[i][1].children[0];
            if (playerSprites[i][0] === hitler) sprite.loadTexture('cards', 3);
            else if (fascists.indexOf(playerSprites[i][0]) !== -1) sprite.loadTexture('cards', 2);
            else sprite.loadTexture('cards', 8);
        }
    };

    ui.investigatePlayer = function (username, role) {
        for (var i = 0; i < playerSprites.length; i++) {
            if (playerSprites[i][0] === username) {
                var sprite = playerSprites[i][1].children[0];
                switch (role) {
                    case 'liberal':
                        sprite.loadTexture('cards', 8);
                        break;
                    case 'fascist':
                        sprite.loadTexture('cards', 2);
                        break;
                }
                break;
            }
        }
    };

    ui.enableAllPlayers = function () {
        for (var i = 0; i < playerSprites.length; i++) {
            playerSprites[i][1].children[0].alpha = 1.0;
        }
    };

    ui.disablePlayer = function (username, kill = false) {
        var sprite;
        for (var i = 0; i < playerSprites.length; i++) {
            if (playerSprites[i][0] === username) {
                sprite = playerSprites[i][1].children[0];
                sprite.alpha = 0.4;

                if (kill) {
                    playerSprites.splice(i, 1);
                    document.getElementById(username).style.textDecoration = 'line-through';
                }
                break;
            }
        }
    };

    ui.disablePlayerSelection = function () {
        var sprite;
        for (var i = 0; i < playerSprites.length; i++) {
            sprite = playerSprites[i][1].children[0];
            sprite.inputEnabled = false;
        }
    };

    ui.showVoteOptions = function (game, veto = false) {
        yesCardSprite = game.add.sprite(350, 387.5, 'cards_210x300', 5);
        noCardSprite = game.add.sprite(1640, 387.5, 'cards_210x300', 9);

        yesCardSprite.inputEnabled = true;
        yesCardSprite.events.onInputDown.add(voteListener, game);
        addGraphicEvents(yesCardSprite);
        noCardSprite.inputEnabled = true;
        noCardSprite.events.onInputDown.add(voteListener, game);
        addGraphicEvents(noCardSprite, game);

        if (!veto) {
            setTimeout(function () {
                if (yesCardSprite.frame) ui.createServerMessage('Voted NO');
                ui.hideVoteOptions();
                console.log(yesCardSprite);
            }, 5000);
        }

    };

    ui.hideVoteOptions = function () {
        yesCardSprite.destroy();
        noCardSprite.destroy();
    };

    ui.enableDraw = function (game) {
        policySprite.inputEnabled = true;
        policySprite.events.onInputDown.add(drawCards, game);
        addGraphicEvents(policySprite, game);
    };

    ui.showThreePolicies = function (drawnCards, game) {
        var policy1;
        var policy2;
        var policy3;

        liberalBoardSprite.alpha = 0.4;
        fascistBoardSprite.alpha = 0.4;
        electionTrackerSprite.alpha = 0.4;

        for (var i = 0; i <allPolicies.length; i++) {
            allPolicies[i].alpha = 0.4;
        }

        if (drawnCards.length === 3) {
            policy1 = (drawnCards[0]) ? game.add.sprite(885, 275, 'cards', 1) : game.add.sprite(885, 275, 'cards', 7);
        } else {
            policy1 = (drawnCards[0]) ? game.add.sprite(915, 275, 'cards', 1) : game.add.sprite(955, 275, 'cards', 7);
        }

        policy2 = (drawnCards[1]) ? game.add.sprite(0, 0, 'cards', 1) : game.add.sprite(0, 0, 'cards', 7);
        policy2.alignTo(policy1, Phaser.RIGHT_CENTER, 24);

        policy1.data = 0;
        policy2.data = 1;

        policy1.inputEnabled = true;
        policy1.events.onInputDown.add(discardPolicy, game);
        addGraphicEvents(policy1, game);
        policy2.inputEnabled = true;
        policy2.events.onInputDown.add(discardPolicy, game);
        addGraphicEvents(policy2, game);

        threePolicies.push(policy1);
        threePolicies.push(policy2);

        if (drawnCards[2] === true || drawnCards[2] === false) {
            policy3 = (drawnCards[2]) ? game.add.sprite(0, 0, 'cards', 1) : game.add.sprite(0, 0, 'cards', 7);
            policy3.alignTo(policy2, Phaser.RIGHT_CENTER, 24);
            policy3.data = 2;
            policy3.inputEnabled = true;
            policy3.events.onInputDown.add(discardPolicy, game);
            addGraphicEvents(policy3, game);
            threePolicies.push(policy3);

        }

    };

    ui.destroyThreePolicies = function () {
        for (var i = 0; i < threePolicies.length; i++) {
            threePolicies[i].destroy();
        }
        threePolicies = [];
    };

    ui.visibilityThreePolicies = function (choice) {
        if (threePolicies.length > 0) {
            if (!choice) {
                for (var i = 0; i < threePolicies.length; i++) {
                    threePolicies[i].visible = false;
                }
            } else {
                for (var i = 0; i < threePolicies.length; i++) {
                    threePolicies[i].visible = true;
                }
            }
        }
    };

    ui.showVeto = function (game) {
        var veto = game.add.button(1400, 340, 'veto', vetoSelected, this, 0, 1);
    };

    ui.placeLiberalPolicy = function (position, game) {
        var sprite = game.add.sprite(599 + (position * 146), 97, 'cards', 7);
        allPolicies.push(sprite);
    };

    ui.placeFascistPolicy = function (position, game) {
        var sprite = game.add.sprite(530 + (position * 145), 447, 'cards', 1);
        allPolicies.push(sprite);
    };

    ui.showStartBtn = function () {
        startBtn.style.display = 'inline-block';
    };

    ui.hideStartBtn = function () {
        startBtn.style.display = 'none';
    };

    ui.showReadyBtn = function () {
        readyBtn.style.display = 'inline-block';
    };

    ui.hideReadyBtn = function () {
        readyBtn.style.display = 'none';
    };

    ui.placeDiscardSprite = function (game) {
        discardSprite = game.add.sprite(1665, 58, 'policy');
    };

    ui.removeDiscardSprite = function () {
        discardSprite.destroy();
    };

    var vetoSelected = function (button) {
        network.sendPeer({ type: 'veto request' });
        button.pendingDestroy = true;

        ui.visibilityThreePolicies(false);
    };

    var addGraphicEvents = function (sprite, game) {
        sprite.events.onInputOver.add(changeCursorOver, game);
        sprite.events.onInputOut.add(changeCursorOut, game);
    };

    var changeCursorOver = function (sprite) {
        sprite.tint = 0xb5ffb2;
        document.getElementsByTagName('CANVAS')[0].style.cursor = 'pointer';
    };

    var changeCursorOut = function (sprite) {
        sprite.tint = 0xffffff;
        document.getElementsByTagName('CANVAS')[0].style.cursor = 'default';
    };

    var discardPolicy = function (sprite) {
        document.getElementsByTagName('CANVAS')[0].style.cursor = 'default';

        var data = {
            type: 'policy select request',
            handIndex: sprite.data
        };
        console.log(data);
        network.sendPeer(data);
        console.log('president discarded');

        ui.destroyThreePolicies();

        liberalBoardSprite.alpha = 1.0;
        fascistBoardSprite.alpha = 1.0;
        electionTrackerSprite.alpha = 1.0;

        for (var i = 0; i <allPolicies.length; i++) {
            allPolicies[i].alpha = 1.0;
        }
    };

    var drawCards = function (sprite) {
        document.getElementsByTagName('CANVAS')[0].style.cursor = 'default';
        sprite.tint = 0xffffff;

        network.sendPeer({type: 'draw request'});
        sprite.inputEnabled = false;
        console.log('draw request sent');
    };

    var chooseCandidate = function (sprite) {
        document.getElementsByTagName('CANVAS')[0].style.cursor = 'default';
        sprite.tint = 0xffffff;

        var selected = {
            type: 'chancellor selection',
            candidate: sprite.data
        };
        network.sendPeer(selected);
        ui.disablePlayerSelection();
    };

    var chooseTarget = function (sprite) {
        document.getElementsByTagName('CANVAS')[0].style.cursor = 'default';
        sprite.tint = 0xffffff;

        var selected = {
            type: 'target request',
            candidate: sprite.data
        };
        console.log(selected);
        network.sendPeer(selected);
        ui.disablePlayerSelection();
    };

    var voteListener = function (sprite) {
        document.getElementsByTagName('CANVAS')[0].style.cursor = 'default';

        var data  = {
            type: 'vote request'
        };
        if (sprite.frame === 5) {
            data.vote = true;
            ui.createServerMessage('Voted YES');
        } else {
            data.vote = false;
            ui.createServerMessage('Voted NO')
        }

        network.sendPeer(data);
        ui.hideVoteOptions();
    };

    var organizeLobby = function () {
        for (var i = 1; i < playerSprites.length; i++) {
            var sprite = playerSprites[i][1].children[0];
            var text = playerSprites[i][1].children[1];
            sprite.alignTo(playerSprites[i - 1][1].children[0], Phaser.RIGHT_CENTER, 16);
            text.alignTo(sprite, Phaser.BOTTOM_CENTER);
        }
    };

    return ui;

} (NETWORK));