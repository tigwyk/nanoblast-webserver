requirejs.config({
    baseUrl: "scripts", //If no baseUrl is explicitly set in the configuration, the default value will be the location of the HTML page that loads require.js.
    paths: {

        react: '../../node_modules/react/dist/react-with-addons.min',
        seedrandom: '../../node_modules/seedrandom/seedrandom',
        lodash: '../../node_modules/lodash/lodash.min',

    }
});

require(['calculator']);