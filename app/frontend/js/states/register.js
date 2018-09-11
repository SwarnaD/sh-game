var STATES = (function(states) {
    'use strict';

    states.register = (function() {
        var backBtn = null;

        // event for register form submission
        document.getElementById("register_form").onsubmit = function (e) {
            e.preventDefault();

            var data = {};
            data.username = document.getElementById("reg_username").value;
            data.password = document.getElementById("reg_password").value;
            data.confirmPassword = document.getElementById("reg_confirm_password").value;
            if (data.username.length <= 0 || data.password <= 0 || data.confirmPassword.length <= 0) {
                alert("All fields are required.");
            }
            else if (data.password != data.confirmPassword) {
                alert("Confirm password is incorrect.");
            }
            else {
                registerRequest(data);
            }
            document.getElementById("register_form").reset();
        };

        // registration request
        var registerRequest = function(data) {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function(){
                switch(this.readyState){
                    case (XMLHttpRequest.DONE):
                        if (this.status === 200) {
                            alert('registration success');
                            backToPrevState();
                        }else{
                            alert('registration failed!');
                        }
                }
            };
            xhttp.open('PUT', '/api/signup/', true);
            xhttp.setRequestHeader('Content-Type', 'application/json');
            xhttp.send(JSON.stringify(data));
        };

        var backToPrevState = function () {
            document.getElementById('register_form').style.display='none';
            this.state.start('login');
        };

        var register = {};

        register.create = function() {
            document.getElementById("register_form").style.display = 'flex';
            backBtn = this.add.button(0, 0, 'back_button', backToPrevState, this, 0, 1);
        };

        return register;
    }());

    return states;

}(STATES || {}));