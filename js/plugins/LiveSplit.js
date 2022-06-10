/*:
* @plugindesc Sends information to LiveSplit to enable autosplitters/load removal
* @author CaptainRektbeard
*/  
(function() {
    var net = require('net');
    var fs = require('fs');
    // Initiate connection to LiveSplit
    var PIPE_NAME = "LiveSplit";
    var PIPE_PATH = "\\\\.\\pipe\\" + PIPE_NAME;
    var client = net.connect(PIPE_PATH);

    function initConnection(callback){
        client = net.connect(PIPE_PATH, callback);
    }

    function sendMessage(message) {
        try{
            client.write(message);
        } catch(e) {
            initConnection(function(){client.write(message);});
        }
    }

    var splits = {
        "transition": [],
        "switch": [],
        "variable": [],
        "event": [],
    }
    // Load split preferences from Autosplitter.json
    fs.readFile('./js/plugins/Autosplitter.json', 'utf8', (err, data) => {
        if (err) {
            console.log(`Error reading file from disk: ${err}`);
        } else {
            JSON.parse(data).forEach(element => {
                splits[element.type].push(element);
            });;
        }
    });

    // Create settings entries, default to true
    ConfigManager['autoStart'] = true;
    ConfigManager['autoSplit'] = true;
    ConfigManager['autoReset'] = true;

    var loading = false;
    var prevRoom = 0;
    var prevSwitches = [];
    var prevVariables = [];
    var prevEvent = 0;

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

        if ($gameMap){
            // Check transition splits
            splits["transition"].forEach(split => {
                if (split.enabled && split.from == prevRoom && split.to == $gameMap.mapId()){
                    sendMessage("split\r\n");
                }
            });
            prevRoom = $gameMap.mapId();
        }
    }

    // Switch splits
    var _Game_Switches_setValue = Game_Switches.prototype.setValue;
    Game_Switches.prototype.setValue = function(switchId, value) {
        if (value != $gameSwitches.value(switchId)){
            splits["switch"].forEach(split => {
                if (split.enabled && split.switch == switchId && split.value == value){
                    sendMessage("split\r\n");
                }
            });
        }
        _Game_Switches_setValue.call(this, switchId, value);
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

    // Add plugin command for entending functionality from events
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        switch (command.toUpperCase()) {
            case "LIVESPLIT":
                sendMessage(args.slice(1).join(" ") + "\r\n");
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