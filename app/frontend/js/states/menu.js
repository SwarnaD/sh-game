var STATES = (function(states, network, host) {
    'use strict';

    states.menu = (function() {
        var game;
        var backBtn = null;
        var hostBtn = null;
        var joinBtn = null;

        var hostGame = function() {

            var peer1 = new SimplePeer({initiator: true, trickle: false});
            var peer2 = new SimplePeer({initiator: false, trickle: false});

            peer1.on('signal', function (offer) {
                peer2.signal(offer);
            });

            peer2.on('signal', function (answer) {
                peer1.signal(answer);
            });

            peer1.on('connect', function () {
                host.init({name: 'default name'}, 10, peer2);
                document.addEventListener("onRoomOpen", function(e) {
                    network.setPeer(peer1);
                    game.state.start('play');
                });
            });
        };

        var goToServerBrowser = function() {
            // start a client for now
            this.state.start('servers');
        };

        var backToPrevState = function () {
            this.state.start('login');
        };

        var menu = {};

        menu.create = function() {
            game = this;
            // remove all objects associated with the load state
            this.world.removeAll();

            // create menu
            backBtn = this.add.button(0, 0, 'back_button', backToPrevState, this, 0, 1);
            hostBtn = this.add.button(this.world.centerX - 75, this.world.centerY, 'host_button', hostGame, this, 0, 1);
            hostBtn.anchor.set(0.5);
            joinBtn = this.add.button(this.world.centerX + 75, this.world.centerY, 'join_button', goToServerBrowser, this, 0, 1);
            joinBtn.anchor.set(0.5);
        };

        return menu;

    }());

    return states;

}(STATES || {}, NETWORK, HOST));



