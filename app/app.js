// dependencies
var express = require('express');
var util = require('util');
var fs = require('fs');
var crypto = require('crypto');
var path = require('path');
var bodyParser = require('body-parser');
var multer  = require('multer');
var http = require('http');
var session = require('express-session')({
    secret: 'xXx1337-noscoper-420xXx',
    resave: false,
    saveUninitialized: true,
    proxy: true,
    cookie: { secure: true, sameSite: true }
});
var https = require("https");

var expressValidator = require('express-validator');

var app = express();

// Local Database
var Datastore = require("nedb");
var users = new Datastore({ filename: path.join(__dirname, "../db/users.db"), autoload: true, timestampData: true });

// https
//var privateKey = fs.readFileSync( path.join(__dirname, 'ssl/server.key') );
//var certificate = fs.readFileSync( path.join(__dirname, 'ssl/server.crt') );
//var config = {
//    key: privateKey,
//    cert: certificate
//};
//var server = https.createServer(config, app);

// http
var server = http.createServer(app);


var io = require('socket.io')(server);
var sharedSession = require('express-socket.io-session');

// middleware

// body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// session middleware
app.use(session);

app.use(express.static('frontend'));

app.use(expressValidator({
    customValidators: {
        fail: function (value) {
            return false;
        }
    }
}));

app.use(function (req, res, next) {
    req.getValidationResult().then(function(result) {
        if (!result.isEmpty()) return res.status(400).send('Validation errors: ' + util.inspect(result.array()));
        else next();
    });
});

// Constructors
var User = function (username, password) {
    if (password) {
        var salt = crypto.randomBytes(16).toString('base64');
        var hash = crypto.createHmac('sha512', salt);
        hash.update(password);
        this.salt = salt;
        this.saltedHash = hash.digest('base64');
    } else {
        this.salt = null;
        this.saltedHash = null;
    }
    this.username = username;
};

// Authentication
var checkPassword = function(user, password){
    var hash = crypto.createHmac('sha512', user.salt);
    hash.update(password);
    var value = hash.digest('base64');
    return (user.saltedHash === value);
};

// API

app.get("/", function (req, res, next) {
    if (!req.session.username) return res.redirect(path.join(__dirname, "/index.html"));
});

app.get("/api/document", function (req, res, next) {
    // return res.redirect(path.join(__dirname, "/document/index.html"));
    return res.redirect("/document/index.html");
});

/**
 * Sign in
 * @body  {string} username
 * @body  {string} password
 *
 * default:
 *      username: admin
 *      password: 1111
 */
app.post('/api/signin/', function (req, res, next) {
    req.checkBody(req.body.username, "invalid username").notEmpty().isAlpha();
    req.checkBody(req.body.password, "invalid password").notEmpty().isAscii();

    if (!req.body.username || !req.body.password) return res.status(400).end("Bad Request");

    users.findOne({ username: req.body.username }, function (err, user) {
        if (err) return res.status(500).end(err);
        else if (user === null) return res.status(404).end();
        else {
            if (!checkPassword(user, req.body.password)) return res.status(401).end("Unauthorized");
            else {
                req.session.username = req.body.username;
                res.cookie('username', req.session.username, {secure: true, sameSite: true});
                return res.end();
            }
        }
    });
});

// Create

/**
 * Sign up for a new account
 * @body  {string} username
 * @body  {string} password
 * @body  {string} confirmPassword
 */
app.put('/api/signup/', function (req, res, next) {
    req.checkBody(req.body.username, "invalid username").notEmpty().isAlpha();
    req.checkBody(req.body.password, "invalid password").notEmpty().isAscii();
    req.checkBody(req.body.confirmPassword, "invalid confirm password").notEmpty().isAscii();

    if (!req.body.username || !req.body.password || !req.body.confirmPassword) return res.status(400).send("Bad Request");
    var newUser = new User(req.body.username, req.body.password);
    users.findOne({ username: req.body.username }, function (err, user) {
        if (err) return res.status(500).end(err);
        if (user != null) return res.status(409).end("Username \"" + req.body.username + "\" already exists.");
        users.insert(newUser, function (err, user) {
            if (err) return res.status(500).end(err);
            return res.json(user);
        });
    });
});

// Read

app.get('/api/users', function (req, res, next) {
    if (!req.session.username) return res.status(403).end("Forbidden");
    if (req.session.username != "admin") return res.status(401).end("Unauthorized");
    users.find({}, function (err, users) {
        if (err) return res.status(400).send("Bad Request");
        return res.json(users);
    });
});

app.get('/api/users/:username', function (req, res, next) {
    req.checkParams(req.params.username).notEmpty().isAlpha();

    if (!req.session.username && req.session.username != req.params.username) return res.status(403).end("Forbidden");
    if (!req.params.username) return res.status(400).send("Bad Request");
    users.findOne({ username: req.params.username }, function (err, user) {
        if (err) return res.status(500).end(err);
        if (user === null) return res.status(404).end();
        return res.json(user);
    });
});

// Update

/**
 * Update password
 * @param   {string} username
 * @body    {string} password
 * @body    {string} confirmPassword
 */
app.patch('/api/users/:username', function (req, res, next) {
    req.checkParams(req.params.username).notEmpty().isAlpha();
    req.checkBody(req.body.password).notEmpty().isAscii();
    req.checkBody(req.body.confirmPassword).notEmpty().isAscii();

    if (!req.session.username) return res.status(403).end("Forbidden");
    if (req.session.username != req.params.username) return res.status(401).end("Unauthorized");
    if (!req.params.username || !req.data.password || !req.data.confirmPassword) return res.status(400).send("Bad Request");
    users.findOne({ username: req.body.username }, function (err, user) {
        if (err) return res.status(500).end(err);
        if (user === null) return res.status(404).end();
        var userUpdate = new User(req.params.username, req.body.password);
        users.update({ username: req.params.username }, {$set: { salt: userUpdate.salt, saltedHash: userUpdate.saltedhash }}, {}, function (err, numUpdated) {
            if (err) return res.status(500).end(err);
            return res.end();
        });
    });
});

// Delete

/**
 * Delete an account
 * @param   {string} username
 */
app.delete('/api/users/:username', function (req, res, next) {
    req.checkParams(req.params.username).notEmpty().isAlpha();

    if (!req.session.username) return res.status(403).end("Forbidden");
    if (req.session.username != req.params.username) return res.status(401).end("Unauthorized");
    users.findOne({ username: req.params.username }, function (err, user) {
        if (err) return res.status(500).end(err);
        if (user === null) return res.status(404).end();
        users.remove({ username: req.params.username }, {}, function (err, numDeleted) {
            if (err) return res.status(500).end(err);
            return res.end();
        });
    });
});

// Socket.io

io.use(sharedSession(session, {
    autoSave: true
}));

io.on('connection', function(socket) {
    console.log('connected ' + socket.handshake.session.username + ' ' + socket.id);

    socket.on('disconnect', function () {
      console.log('disconnected ' + socket.handshake.session.username + ' ' + socket.id);
    });

    // Client is creating a game room, add their socket to the 'game rooms'
    // socket list
    socket.on('create room', function () {
        socket.join('game rooms');
        console.log('created a room for ' + socket.id);
        
        var data = {};
        data.username = socket.handshake.session.username;
        
        socket.emit('room created', data);
    });

    // Client is closing their game room
    socket.on('close room', function () {
        socket.leave('game rooms');
    });

    // a client is requesting a rooms list, ping all clients with a room open
    // for a room info response
    socket.on('request room list', function () {
        var data = {};
        data.requesterID = socket.id;
        io.in('game rooms').emit('request room info', data);
        console.log('pinging all rooms');
    });

    // a client is responding to a room info request, emit to the original requester
    socket.on('answer room info', function (data) {
        if (data.requesterID && data.roomInfo) {
            data.roomInfo.ownerID = socket.id;
            data.roomInfo.ownerName = socket.handshake.session.username;
            socket.broadcast.to(data.requesterID).emit('answer room list', data.roomInfo);
        }
    });

    // a client is requesting to join a given game room, emit the offer data to the room owner
    socket.on('request join', function (data) {
        if (data.joineeID) {
            data.requesterID = socket.id;
            data.username = socket.handshake.session.username;
            socket.broadcast.to(data.joineeID).emit('request join', data);
        }
    });

    // a client is requesting to join their own room
    socket.on('request join self', function (data) {
        data.requesterID = socket.id;
        data.username = socket.handshake.session.username;
        socket.broadcast.to(socket.id).emit('request join', data);
    });

    socket.on('accept join', function (data) {
        if (data.requesterID) {
            socket.broadcast.to(data.requesterID).emit('accept join', data.answer);
        }
    });
});

server.listen(3000, function () {
    console.log('HTTP(S) on port 3000');
});
