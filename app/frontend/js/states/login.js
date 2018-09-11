var STATES = (function(states, network) {
    'use strict';

    states.login = (function() {
        var game = null;
        var backBtn = null;
        var registerBtn = null;

        // login submission button
        document.getElementById("login_form").onsubmit = function (e) {
            //prevent default refresh
            e.preventDefault();

            var data = {};
            data.username = document.getElementById("login_username_input").value;
            data.password = document.getElementById("login_password_input").value;

            if (data.username.length <= 0 || data.password.length <= 0) {
                alert("Username or Password is incorrect.");
            }
            else {
                loginRequest(data);
            }
            document.getElementById("login_form").reset();
        };

        // login request
        var loginRequest = function(data) {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                switch(this.readyState){
                    case (XMLHttpRequest.DONE):
                        if (this.status === 200) {
                            document.getElementById('login_form').style.display='none';
                            goToMenu();
                        } else{
                            alert('login failed!');
                        }
                }
            };
            xhttp.open('POST', '/api/signin/', true);
            xhttp.setRequestHeader('Content-Type', 'application/json');
            xhttp.send(JSON.stringify(data));
        };

        var goToRegistration = function() {
            document.getElementById('login_form').style.display = 'none';
            this.state.start('register');
        };
        
        var goToMenu = function() {
            // initializae socket to master server
            network.initMaster();

            // go to menu state
            game.state.start('menu');
        };

        var backToPrevState = function () {
            document.getElementById('login_form').style.display='none';
            this.state.start('load');
        };

        var login = {};

        login.create = function() {
            // remove all objects associated with the load state
            this.world.removeAll();

            // keep the reference of the game
            game = this;

            // login here
            document.getElementById('login_form').style.display = 'flex';
            backBtn = this.add.button(0, 0, 'back_button', backToPrevState, this, 0, 1);
            registerBtn = this.add.button(this.world.centerX + 200, this.world.centerY + 200, 'register_button', goToRegistration, this, 0, 1);

            //skip for now
            //this.state.start('menu');
            
        };

        return login;

    }());

    return states;

}(STATES || {}, NETWORK));