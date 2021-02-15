var database = require('./database');
const dotenv = require('dotenv');
dotenv.config();
var config = require('../config/config');
var date = require('date-fns');

var stats;
var generated;
var bankrollOffset = config.BANKROLL_OFFSET;

function humanReadableDate(comparisonDate) {
    const today = new Date();
    const yesterday = date.subDays(today, 1);
    const aWeekAgo = date.subDays(today, 7);
    const twoWeeksAgo = date.subDays(today, 14);
    const threeWeeksAgo = date.subDays(today, 21);

    // Get the date in English locale to match English day of week keys
    const compare = date.parseISO(comparisonDate);

    let result = '';
    if (date.isSameDay(compare, today)) {
        result = intl.t('Updated.Today');
    } else if (date.isSameDay(compare, yesterday)) {
        result = intl.t('Updated.Yesterday');
    } else if (date.isAfter(compare, aWeekAgo)) {
        result = intl.t(`Updated.${date.formatDate(compare, 'EEEE')}`);
    } else if (date.isAfter(compare, twoWeeksAgo)) {
        result = intl.t('Updated.LastWeek');
    } else if (date.isAfter(compare, threeWeeksAgo)) {
        result = intl.t('Updated.TwoWeeksAgo');
    }
    console.log(result);
    return result;
}

function getSiteStats() {
    database.getSiteStats(function(err, results) {
        if (err) {
            console.error('[INTERNAL_ERROR] Unable to get site stats: \n' + err);
            return;
        }

        stats = results;
        generated = new Date();
    });
}

setInterval(getSiteStats, 1000 * 60 * 20);
getSiteStats();

exports.index = function(req, res, next) {
    if (!stats) {
        return next('Stats are loading');
    }
    var user = req.user;

    stats.bankroll_offset = bankrollOffset;

    res.render('stats', { user: user, generated: humanReadableDate(generated), stats: stats });

};
