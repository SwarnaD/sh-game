var STATES = (function(states) {
    'use strict';

    states.boot = (function() {

        var boot = {};
    
        boot.preload = function() {
            //this.load.image('logo', '/assets/phaser.png');
            this.load.image('logo', 'assets_created/logos/croissant.png');
        };

        boot.create = function() {
            
            // start the physics system (we're using the simplest one in Phaser, ARCADE)
            this.physics.startSystem(Phaser.Physics.ARCADE);

            // call the load states
            this.state.start('load');
        };

        return boot;

    }());

    return states;

}(STATES || {}));