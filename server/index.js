var fs = require('fs');

var express = require('express');
var http = require('http');
var assert = require('assert');
var compression = require('compression');
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var socketIO = require('socket.io');
var ioCookieParser = require('socket.io-cookie');
const dotenv = require('dotenv');
var _ = require('lodash');
var debug = require('debug')('app:index');
var app = express();
debug('loading config overwrites from .env');
dotenv.config();
var config = require('../config/config');


var routes = require('./routes');
var database = require('./database');
var Chat = require('./chat');
var lib = require('./lib');

debug('booting nanoblast webserver');

/** Render Engine
 *
 * Put here render engine global variable trough app.locals
 * **/
app.set("views", path.join(__dirname, '../views'));

app.locals.recaptchaKey = config.RECAPTCHA_SITE_KEY;
app.locals.buildConfig = config.BUILD;
app.locals.miningFeeRais = config.MINING_FEE/100;

var dotCaching = true;
if (!config.PRODUCTION) {
    app.locals.pretty = true;
    dotCaching = false;
}

app.engine("html", require("dot-emc").init(
    {
        app: app,
        fileExtension:"html",
        options: {
            templateSettings: {
                cache: dotCaching
            }
        }
    }
).__express);


/** Middleware **/
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
  }));
app.use(cookieParser());
app.use(compression());
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });


/** App settings **/
app.set("view engine", "html");
app.disable('x-powered-by');
app.enable('trust proxy');


/** Serve Static content **/
var twoWeeksInSeconds = 1209600;
if(config.PRODUCTION) {
    app.use(express.static(path.join(__dirname, '../build'), { maxAge: twoWeeksInSeconds * 1000 }));
} else {
    app.use(express.static(path.join(__dirname, '../client_new'), { maxAge: twoWeeksInSeconds * 1000 }));
    app.use('/client_old', express.static(path.join(__dirname, '../client_old'), { maxAge: twoWeeksInSeconds * 1000 }));
    app.use('/node_modules', express.static(path.join(__dirname, '../node_modules'), { maxAge: twoWeeksInSeconds * 1000 }));
}


/** Login middleware
 *
 * If the user is logged append the user object to the request
 */
app.use(function(req, res, next) {
    debug('incoming http request');

    var sessionId = req.cookies.id;

    if (!sessionId) {
        res.header('Vary', 'Accept, Accept-Encoding, Cookie');
        res.header('Cache-Control', 'public, max-age=60'); // Cache the logged-out version
        return next();
    }

    res.header('Cache-Control', 'no-cache');
    res.header("Content-Security-Policy", "frame-ancestors 'none'");


    if (!lib.isUUIDv4(sessionId)) {
        res.clearCookie('id');
        return next();
    }

    database.getUserBySessionId(sessionId, function(err, user) {
        if (err) {
            res.clearCookie('id');
            if (err === 'NOT_VALID_SESSION') {
                return res.redirect('/');
            } else {
                console.error('[INTERNAL_ERROR] Unable to get user by session id ' + sessionId + ':', err);
                return res.redirect('/error');
            }
        }
        user.advice = req.query.m;
        user.error = req.query.err;
        user.eligible = lib.isEligibleForGiveAway(user.last_giveaway);
        user.admin = user.userclass === 'admin';
        user.moderator = user.userclass === 'admin' ||
                         user.userclass === 'moderator';
        req.user = user;
        next();
    });

});

/** Error Middleware
 *
 * How to handle the errors:
 * If the error is a string: Send it to the client.
 * If the error is an actual: error print it to the server log.
 *
 * We do not use next() to avoid sending error logs to the client
 * so this should be the last middleware in express .
 */
function errorHandler(err, req, res, next) {

    if (err) {
        if(typeof err === 'string') {
            return res.render('error', { error: err });
        } else {
            if (err.stack) {
                console.error('[INTERNAL_ERROR] ', err.stack);
            } else console.error('[INTERNAL_ERROR', err);

            res.render('error');
        }

    } else {
        console.warning("A 'next()' call was made without arguments, if this an error or a msg to the client?");
    }

}

routes(app);
app.use(errorHandler);

/**  Server **/
var server = http.createServer(app);
var io = socketIO(server); //Socket io must be after the lat app.use
io.use(ioCookieParser);

/** Socket io login middleware **/
io.use(function(socket, next) {
    debug('incoming socket connection');
    //console.log('incoming socket connection');

    var sessionId = (socket.request.headers.cookie)? socket.request.headers.cookie.id : null;
    
    //If no session id or wrong the user is a guest
    if(!sessionId || !lib.isUUIDv4(sessionId)) {
        socket.user = false;
        console.log("Session doesn't match user");
        return next();
    }

    database.getUserBySessionId(sessionId, function(err, user) {

        //The error is handled manually to avoid sending it into routes
        if (err) {
            if (err === 'NOT_VALID_SESSION') {
                //socket.emit('err', 'NOT_VALID_SESSION');
                next(new Error('NOT_VALID_SESSION'));
            } else {
                console.error('[INTERNAL_ERROR] Unable to get user in socket by session ' + sessionId + ':', err);
                next(new Error('Unable to get the session on the server, logged as a guest.'));
                //return socket.emit('err', 'INTERNAL_ERROR');
            }
            socket.user = false;
            console.log("Failed to look up user in db");
            return next();
        }

        //Save the user info in the socket connection object
        socket.user = user;
        //console.log("Socket user is: ",socket.user);
        socket.user.admin = user.userclass === 'admin';
        socket.user.moderator = user.userclass === 'admin' || user.userclass === 'moderator';
        next();
    });
});


var chatServer = new Chat(io);

server.listen(config.PORT, function() {
    console.log('Listening on port ', config.PORT);
});

/** Log uncaught exceptions and kill the application **/
process.on('uncaughtException', function (err) {
    console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
    console.error(err.stack);
    process.exit(1);
});