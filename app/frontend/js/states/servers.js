var STATES = (function(states, network) {
    'use strict';

    states.servers= (function() {
        // private variables
        var game;
        var servers_form;
        var servers_view;
        var servers_list;
        var backBtn;
        var refreshBtn;

        // private functions
        var Room = function (roomInfo) {
            this.ownerID = roomInfo.ownerID;
            this.ownerName = roomInfo.ownerName;
            this.name = roomInfo.name;
            this.occupancy = roomInfo.occupancy;
            this.capacity = roomInfo.capacity;
        };

        var refreshRequest = function() {
            servers_list = [];
            network.masterEmit('request room list');
        };

        var refresh = function(roomInfo) {
            var newRoom = true;
            for (var i = 0; i < servers_list.length; i++) {
                if (servers_list[i].ownerID === roomInfo.ownerID) {
                    servers_list[i] = new Room(roomInfo);
                    newRoom = false;
                    break;
                }
            }
            if (newRoom) {
                servers_list.push(new Room(roomInfo));
            }
            updateServersView();
        };

        var updateServersView = function() {
            var option;
            servers_view.innerHTML = '';
            for (var i = 0; i < servers_list.length; i++) {
                option = document.createElement('option');
                option.text = servers_list[i].name + ' | ' + servers_list[i].ownerName + ' | ' + servers_list[i].occupancy + '/' + servers_list[i].capacity;
                option.value = servers_list[i].ownerID;
                servers_view.add(option);
            }
        };

        var backToPrevState = function() {
            servers_form.style.display = 'none';
            this.state.start('menu');
        };

        var servers = {};

        servers.create = function() {
            game = this;
            // remove all objects associated with the load state
            this.world.removeAll();

            servers_list = [];
            servers_form = document.getElementById('server_form');
            servers_view = document.getElementById('server_select');
            servers_form.style.display='flex';
            backBtn = this.add.button(0, 0, 'back_button', backToPrevState, this, 0, 1);

            // do a refresh of the server list
            refreshRequest();

            refreshBtn = this.add.button(this.world.centerX + 200, this.world.centerY + 200, 'refresh_button', refreshRequest, this, 0, 1);

            //listeners (lives and dies with this state)
            document.addEventListener("onRoomListAnswer", function(e) {
                refresh(e.detail);
            });

            // attempt to join selected server
            servers_form.onsubmit = function (e) {
                //prevent default refresh
                e.preventDefault();

                if (servers_view.value) {
                    var data = {};
                    data.joineeID = servers_view.value;
            
                    var peer = new SimplePeer({initiator: true, trickle: false});

                    peer.on('signal', function(offer) {

                        document.addEventListener("onJoinAcceptance", function(e) {
                            peer.on('connect', function () {
                                network.setPeer(peer);
                                servers_form.style.display = 'none';
                                game.state.start('play');
                            });

                            console.log(peer);
                            if (!peer.destroyed) {
                                peer.signal(e.detail);
                            }
                        });

                        data.offer = offer;
                        network.masterEmit('request join', data);
                    });
                }

            };
        };

        return servers;

    }());

    return states;

}(STATES || {}, NETWORK));