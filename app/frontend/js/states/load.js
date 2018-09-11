var STATES = (function(states) {
    'use strict';

    states.load = (function() {
        var logo;
        var text;
        var playBtn;
    
        var load = {};

        load.preload = function() {
            this.load.spritesheet('play_button', 'assets_created/buttons/play_button_spritesheet.png', 159, 64);
            this.load.spritesheet('register_button', 'assets_created/buttons/register_button_spritesheet.png', 204, 64);
            this.load.spritesheet('back_button', 'assets_created/buttons/back_button_spritesheet.png', 103, 100);
            this.load.image('secret_hitler_logo', 'assets_created/game/secret_hitler_logo.png');
            this.load.image('policy', 'assets_created/game/policy_160x229.png');
            this.load.image('liberal_board', 'assets_created/game/liberal_board_1000x323.png');
            this.load.image('fascist_board', 'assets_created/game/fascist_board_1000x323.png');
            this.load.image('fascist_board_7-8', 'assets_created/game/fascist_board_7-8_1000x323.png');
            this.load.image('fascist_board_9-10', 'assets_created/game/fascist_board_9-10_1000x323.png');
            this.load.spritesheet('cards', 'assets_created/game/125x179/cards_125x179_spritesheet.png', 125, 179);
            this.load.spritesheet('cards_210x300', 'assets_created/game/cards_210x300_spritesheet.png', 210, 300);
            this.load.spritesheet('yes_no_selected', 'assets_created/game/yes_no_selected_spritesheet.png', 210, 300);
            this.load.image('election_tracker', 'assets_created/game/election_tracker.png');
            this.load.spritesheet('veto', 'assets_created/game/veto_spritesheet.png', 108, 40);
            this.load.spritesheet('host_button', 'assets_created/buttons/host_button_spritesheet.png', 103, 50);
            this.load.spritesheet('join_button', 'assets_created/buttons/join_button_spritesheet.png', 95, 50);
            this.load.spritesheet('refresh_button', 'assets_created/buttons/refresh_button_spritesheet.png', 138, 50);
        };


        load.create = function() {

            //this.stage.backgroundColor = '#2EAEBF';
            this.stage.backgroundColor = '#eeeeee';

            //	You can listen for each of these events from Phaser.Loader
            this.load.onLoadStart.add(loadStart, this);
            this.load.onFileComplete.add(fileComplete, this);
            this.load.onLoadComplete.add(loadComplete, this);


            logo = this.add.sprite(this.world.centerX, this.world.centerY - 75, 'logo');
            logo.anchor.setTo(0.5, 0.5);


            //	Progress report
            text = this.add.text(32, 32, '', { fill: '#ffffff' });

            // everything to load here
            /* examples
            this.load.image('picture1', '/assets/pics/mighty_no_09_cover_art_by_robduenas.jpg');
            this.load.image('picture2', '/assets/pics/cougar_dragonsun.png');
            this.load.image('picture3', '/assets/pics/trsipic1_lazur.jpg');
            this.load.image('picture4', '/assets/pics/archmage_in_your_face.png');
            this.load.image('picture5', '/assets/pics/acryl_bladerunner.png');
            this.load.image('picture6', '/assets/pics/acryl_bobablast.png');
            this.load.image('picture7', '/assets/pics/alex-bisleys_horsy_5.png');
            */
            
            // start loading
            this.load.start();
        };

        // callback on load start
        var loadStart = function loadStart() {
	        text.setText("Loading ...");
        };

        //	callback on file complettion
        var fileComplete = function(progress, cacheKey, success, totalLoaded, totalFiles) {
            text.setText("File Complete: " + progress + "% - " + totalLoaded + " out of " + totalFiles);
        };

        // callback on all file load completeion
        var loadComplete = function() {
            text.setText("Load Complete");
            playBtn = this.add.button(this.world.centerX - 95, this.world.centerY + 200, 'play_button', start, this, 0, 1);
        };

        var start = function() {
            this.state.start('login', true);
        };

        return load;

    }());

    return states;

}(STATES || {}));