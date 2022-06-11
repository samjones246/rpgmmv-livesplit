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
    var callstack = [];

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
        if (!!value != !!$gameSwitches.value(switchId)){
            splits["switch"].forEach(split => {
                if (split.enabled && split.id == switchId && (split.any || split.value == !!value)){
                    sendMessage("split\r\n");
                }
            });
        }
        _Game_Switches_setValue.call(this, switchId, value);
    }

    // Variable splits
    var _Game_Variables_setValue = Game_Variables.prototype.setValue;
    Game_Variables.prototype.setValue = function(variableId, value) {
        if (value != $gameVariables.value(variableId)){
            splits["variable"].forEach(split => {
                if (split.enabled && split.id == variableId && (split.any || split.value == value)){
                    sendMessage("split\r\n");
                }
            });
        }
        _Game_Variables_setValue.call(this, variableId, value);
    }

    // Event splits
    // -Local events
    var _Game_Map_setupStartingMapEvent = Game_Map.prototype.setupStartingMapEvent;
    Game_Map.prototype.setupStartingMapEvent = function() {
        var events = this.events();
        for (var i = 0; i < events.length; i++) {
            var event = events[i];
            if (event.isStarting()) {
                this._interpreter._ls_pageIndex = event._pageIndex;
                break;
            }
        }
        return _Game_Map_setupStartingMapEvent.call(this);
    }
    // -Common events
    // --Triggered from code
    var _Game_Interpreter_command117= Game_Interpreter.prototype.command117;
    Game_Interpreter.prototype.command117 = function() {
        this._ls_nextid = this._params[0];
        return _Game_Interpreter_command117.call(this);
    }

    var _Game_Interpreter_setupChild = Game_Interpreter.prototype.setupChild;
    Game_Interpreter.prototype.setupChild = function(list, eventId) {
        this._childInterpreter = new Game_Interpreter(this._depth + 1);
        this._childInterpreter._ls_eventId = this._ls_nextid;
        this._childInterpreter.setup(list, eventId);
    }

    // --Autorun
    var _Game_Map_setupAutorunCommonEvent = Game_Map.prototype.setupAutorunCommonEvent;
    Game_Map.prototype.setupAutorunCommonEvent = function() {
        for (var i = 0; i < $dataCommonEvents.length; i++) {
            var event = $dataCommonEvents[i];
            if (event && event.trigger === 1 && $gameSwitches.value(event.switchId)) {
                this._interpreter._ls_eventId = event.id;
                break;
            }
        }
        return _Game_Map_setupAutorunCommonEvent.call(this);
    }

    // --Parallel
    var _Game_CommonEvent_update = Game_CommonEvent.prototype.update;
    Game_CommonEvent.prototype.update = function() {
        if (this._interpreter && !this._interpreter.isRunning()){
            this._interpreter._ls_eventId = this._commonEventId;
        }
        _Game_CommonEvent_update.call(this);
    }

    var _Game_Interpreter_setup = Game_Interpreter.prototype.setup;
    Game_Interpreter.prototype.setup = function(list, eventId) {
        _Game_Interpreter_setup.call(this, list, eventId);
        var common = this._eventId == 0 || this._depth > 0;
        this._ls_splitLines = [];
        splits["event"].forEach(split => {
            if (!split.enabled || !!split.common != common){
                return;
            }
            if (common){
                if (split.event == this._ls_eventId){
                    console.log("Registering split for common event " + this._ls_eventId + " line " + split.line);
                    this._ls_splitLines.push(split.line)
                }
            } else {
                if (split.map == this._mapId && split.event == this._eventId && split.page == this._ls_pageIndex + 1){
                    console.log("Registering split for event " + split.map + ":" + split.event + ":" + split.page + " line " + split.line);
                    this._ls_splitLines.push(split.line)
                }
            }
        });
        this._ls_splitLines.sort(function(a, b){return b - a})
    }

    var _Game_Interpreter_executeCommand = Game_Interpreter.prototype.executeCommand;
    Game_Interpreter.prototype.executeCommand = function() {
        var lasti = this._ls_splitLines.length -1;
        if (this._ls_splitLines.length > 0 && (this._index == this._ls_splitLines[lasti] || this._index >= this._list.length && this._ls_splitLines[lasti] == -1)){
            sendMessage("split\r\n");
            this._ls_splitLines.pop();
        }
        return _Game_Interpreter_executeCommand.call(this);
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