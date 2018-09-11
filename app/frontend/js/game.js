(function(states) {
    'use strict';
    
    //main game object
    var game = {};

    window.onload = function() {

        // initialize game object
        game = new Phaser.Game(1920, 1080, Phaser.AUTO, 'gameDiv');
    
        
        // add the states we will use
        game.state.add('boot', states.boot);
        game.state.add('load', states.load);
        game.state.add('login', states.login);
        game.state.add('register', states.register);
        game.state.add('menu', states.menu);
        game.state.add('servers', states.servers);
        game.state.add('play', states.play);

        // launch the boot state
        game.state.start('boot');
    };

}(STATES));