var assert = require('assert');
var nano = require('./nano_client');
var db = require('./database');
var request = require('request');
const dotenv = require('dotenv');
dotenv.config();
var config = require('../config/config');

// Doesn't validate
module.exports = function(userId, amount, withdrawalAddress, withdrawalId, callback) {
    var minWithdraw = config.MINING_FEE + 100;
    assert(typeof userId === 'number');
    assert(amount >= minWithdraw);
    assert(typeof withdrawalAddress === 'string');
    assert(typeof callback === 'function');

    db.makeWithdrawal(userId, amount, withdrawalAddress, withdrawalId, function (err, fundingId) {
        if (err) {
            if (err.code === '23514')
                callback('NOT_ENOUGH_MONEY');
            else if(err.code === '23505')
                callback('SAME_WITHDRAWAL_ID');
            else
                callback(err);
            return;
        }

        assert(fundingId);

        var amountToSend = (amount - config.MINING_FEE) / 1e8;
        nano.send(process.env.NANO_ACCOUNT_SEED,withdrawalAddress, amountToSend, function (err, hash) {
            if (err) {
                if (err.message === 'Insufficient funds')
                    return callback('PENDING');
                return callback('FUNDING_QUEUED');
            }

            db.setFundingsWithdrawalTxid(fundingId, hash, function (err) {
                if (err)
                    return callback(new Error('Could not set fundingId ' + fundingId + ' to ' + hash + ': \n' + err));

                callback(null);
            });
        });
    });
};