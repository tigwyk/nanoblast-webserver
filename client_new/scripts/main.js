requirejs.config({
    baseUrl: "/scripts", //If no baseUrl is explicitly set in the configuration, the default value will be the location of the HTML page that loads require.js.
    paths: {
        autolinker: '../../node_modules/autolinker/dist/Autolinker',
        classnames: '../../node_modules/classnames/index',
        lodash: '../../node_modules/lodash/lodash.min',
        react: '../../node_modules/react/dist/react-with-addons.min',
        seedrandom: '../../node_modules/seedrandom/seedrandom',
        socketio: '../../node_modules/socket.io-client/dist/socket.io.min',
        mousetrap: '../../node_modules/mousetrap/mousetrap',
        screenfull: '../../node_modules/screenfull/dist/screenfull' 
    },
    name: "nanoblast",
    shim: {

    }
});

require(['game']);