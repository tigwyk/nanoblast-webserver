define([
    'lib/react',
    'components/Game',
    'lib/clib',
    'game-logic/engine'
], function(
    React,
    GameClass,
    Clib,
    Engine
) {

    var Game = React.createFactory(GameClass);

    React.render(
        Game(),
        document.getElementById('game')
    );

    //Update the balance in an ugly way TODO: Improve
    Engine.on('all', function() {
        var elem = document.getElementById('balance_rais');
        if (elem)
            elem.innerHTML = Clib.formatRais(Engine.balanceRais, 2);
        else
            console.log('[main] No balance container');
    });
});