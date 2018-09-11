var NETWORK = (function() {
    'use strict';

    // main web socket to interact with backend server
    var master;

    // webrtc channel to room host (either another browser/computer or self)
    var peer;


    var network = {};
    
    // master socket functions

    // initiate the connection to the backend socket
    network.initMaster = function() {
        master = io();

        // listen for these emissions and dispatch a corresponding event
        master.on('request room info', function (data) {
            document.dispatchEvent(new CustomEvent("onRoomInfoRequest", {'detail': data}));
        });

        master.on('request join', function (data) {
            document.dispatchEvent(new CustomEvent("onJoinRequest", {'detail': data}));
        });

        master.on('answer room list', function(data) {
            document.dispatchEvent(new CustomEvent("onRoomListAnswer", {'detail': data}));
        });

        master.on('accept join', function (data) {
            document.dispatchEvent(new CustomEvent("onJoinAcceptance", {'detail': data}));
        });

        master.on('room created', function (data) {
            document.dispatchEvent(new CustomEvent("onRoomCreation", {'detail': data}));
        });
    };

    // emit to the master socket
    network.masterEmit = function(event, data) {
        if (data) master.emit(event, data);
        else master.emit(event);
    };

    // peer functions

    // set a new peer
    network.setPeer = function (newPeer) {
        network.closePeer();

        peer = newPeer;

        // listen for these emissions and dispatch a corresponding event
        peer.on('data', function(data) {
            document.dispatchEvent(new CustomEvent("onPeerData", {'detail': JSON.parse(data)}));
        });

        // on close, remove from peers list
        peer.on('close', function() {
            document.dispatchEvent(new Event("onPeerClose"));
        });
    };

    // close the peer connection
    network.closePeer = function (callback) {
        if (peer) {
            peer.destroy(callback);
        }
    };

    // send data to the peer
    network.sendPeer = function (data) {
        if (peer) {
            peer.send(JSON.stringify(data));
        }
    };

    return network;

}());