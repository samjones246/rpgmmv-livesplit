/*:
* @plugindesc Sends information to LiveSplit to enable autosplitters/load removal
* @author CaptainRektbeard
*/  
(function() {
    // Initiate connection to LiveSplit
    var net = require('net');
    var PIPE_NAME = "LiveSplit";
    var PIPE_PATH = "\\\\.\\pipe\\" + PIPE_NAME;
    var client = net.connect(PIPE_PATH);

    function initConnection(callback){
        client = net.connect(PIPE_PATH, callback);
    }

    ConfigManager['autoStart'] = true;
    ConfigManager['autoSplit'] = true;
    ConfigManager['autoReset'] = true;
    var loading = false;

    function sendMessage(message) {
        try{
            client.write(message);
        } catch(e) {
            initConnection(function(){client.write(message);});
        }
    }

    // Overwrite SceneManager.changeScene (called each frame, handles scene transitions)
    var _SceneManager_changeScene = SceneManager.changeScene;
    SceneManager.changeScene = function() {
        _SceneManager_changeScene.call(this);

        // Loading started
        if (!SceneManager.isCurrentSceneStarted() && !loading){
            sendMessage("pausegametime\r\n");
            loading = true;
        // Loading finished
        }else if (SceneManager.isCurrentSceneStarted() && loading){
            sendMessage("unpausegametime\r\n");
            loading = false;
        }
    }

    // Auto Start
    var _Scene_Title_commandNewGame = Scene_Title.prototype.commandNewGame;
    Scene_Title.prototype.commandNewGame = function() {
        _Scene_Title_commandNewGame.call(this);
        if (ConfigManager['autoStart']){
            sendMessage("starttimer\r\n");
        }
    }

    // Auto Reset
    var _SceneManager_onKeyDown = SceneManager.onKeyDown;
    SceneManager.onKeyDown = function(event) {
        _SceneManager_onKeyDown.call(this, event);
        if (event.keyCode === 116 && ConfigManager['autoReset']) {
            sendMessage("reset\r\n");
        }
    }

    // Add plugin commands
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        switch (command.toUpperCase()) {
            case "LIVESPLIT_split":
                console.log("split");
                sendMessage("split\r\n");
                break;
        }
    }

    // Add settings
    var _Window_Options_makeCommandList = Window_Options.prototype.makeCommandList;
    Window_Options.prototype.makeCommandList = function() {
        _Window_Options_makeCommandList.call(this);
        this.addCommand("Auto Start", 'autoStart');
        this.addCommand("Auto Split", 'autoSplit');
        this.addCommand("Auto Reset", 'autoReset');
    }

    // Overwrite ConfigManager.makeData
    var _ConfigManager_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        var config = _ConfigManager_makeData.call(this);
        config['autoStart'] = ConfigManager['autoStart'];
        config['autoSplit'] = ConfigManager['autoSplit'];
        config['autoReset'] = ConfigManager['autoReset'];
        return config;
    }

    // Overwrite ConfigManager.applyData
    var _ConfigManager_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function(config) {
        _ConfigManager_applyData.call(this, config);
        ConfigManager['autoStart'] = config['autoStart'];
        ConfigManager['autoSplit'] = config['autoSplit'];
        ConfigManager['autoReset'] = config['autoReset'];
    }

})();