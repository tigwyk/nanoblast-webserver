var assert = require('assert');
var async = require('async');
var database = require('./database');
var config = require('../config/config');

/**
 * The req.user.admin is inserted in the user validation middleware
 */

exports.giveAway = function(req, res) {
    var user = req.user;
    assert(user.admin);
    res.render('giveaway', { user: user });
};

exports.giveAwayHandle = function(req, res, next) {
    var user = req.user;
    assert(user.admin);

    if (config.PRODUCTION) {
        var ref = req.get('Referer');
        if (!ref) return next(new Error('Possible xsfr')); //Interesting enough to log it as an error

        if (ref.lastIndexOf('https://game.neutralgood.dev/admin-giveaway', 0) !== 0)
            return next(new Error('Bad referrer got: ' + ref));
    }

    var giveAwayUsers = req.body.users.split(/\s+/);
    var rais = parseFloat(req.body.rais);

    if (!Number.isFinite(rais) || rais <= 0)
        return next('Problem with rais...');

    var satoshis = Math.round(rais);

    database.addRawGiveaway(giveAwayUsers, satoshis , function(err) {
        if (err) return res.redirect('/admin-giveaway?err=' + err);

        res.redirect('/admin-giveaway?m=Done');
    });
};