var nano = require('nanocurrency');
var fs = require('fs');
var path = require('path');
var config = require('../config/config');
const WS = require('ws');
const ReconnectingWebSocket = require('reconnecting-websocket');

// Create a reconnecting WebSocket.
// In this example, we wait a maximum of 2 seconds before retrying.
const client = new ReconnectingWebSocket('ws://ec2-3-222-154-131.compute-1.amazonaws.com:7078', [], {
	WebSocket: WS,
	connectionTimeout: 1000,	
	maxRetries: 100000,
	maxReconnectionDelay: 2000,
	minReconnectionDelay: 10 // if not set, initial connection will take a few seconds by default
});

// As soon as we connect, subscribe to block confirmations
client.onopen = () => {
	const confirmation_subscription = {
		"action": "subscribe", 
		"topic": "confirmation"
	}
	client.send(JSON.stringify(confirmation_subscription));

	// Other subscriptions can go here
};

// The node sent us a message
client.onmessage = msg => {
	console.log(msg.data);
	data_json = JSON.parse(msg.data);

	if (data_json.topic === "confirmation") {
		console.log ('Confirmed', data_json.message.hash)
	}
};
/*
var client = new nano.Client({
    host: config.BITCOIND_HOST,
    port: config.BITCOIND_PORT,
    user: config.BITCOIND_USER,
    pass: config.BITCOIND_PASS,
    ssl: true,
    sslStrict: true,
    sslCa: new Buffer(config.BITCOIND_CERT)
});
*/

module.exports = client;