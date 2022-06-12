# RPGMMV-LiveSplit
A plugin for RPG Maker MV games which adds LiveSplit server integration, enabling auto start, split, reset and load removal. Includes support for loading a game specific Autosplitter.json file, which describes desired split points for a game.

## Features
 - Auto start when 'New Game' is clicked on the main menu
 - Auto reset when pressing F5 to reload the game
 - Load removal, pauses the LiveSplit timer while the game is loading during scene transitions. LiveSplit must be using the 'Game Time' comparison for this to take effect.
 - Auto split, if an Autosplitter.json for the game is supplied. This file can describe split points using various mechanisms supported by this plugin. See 'Writing an autosplitter' below for more details.

## Installation
Download LiveSplit.js from this repository and copy it to `<game install folder>/www/js/plugins/`. Then, open `<game install folder>/www/js/plugins.js` in a text editor such as notepad. If you scroll down to the bottom of the file, you'll see something like the following:


    {name:"blah", status:true, "description":"blah blah blah"...}
    ];


Add a `,` to the end of the second to last line (the one ending with a `}`), then press enter and paste the following onto the new line:


    {name:"LiveSplit", status:true}


The end of the file should now look like this:


    {name:"blah", status:true, "description":"blah blah blah"...},
    {name:"LiveSplit", status:true}
    ];


Save the file, and the plugin should be enabled. 


If there is an Autosplitter.json file avaialable for this game, you can install it by dropping it into the same place where you put LiveSplit.js (`<game install folder>/www/js/plugins/`). The autosplitter will implement a selection of different split points, but you can choose which ones are enabled by editing AutosplitterSettings.json. This file will be generated the first time you run the game with the autosplitter installed, and will be populated with the defaults specified by the author of the autosplitter. The file should look something like this:


    {
        "level1":false,
        "level2":true,
        "firstBoss":true
    }


Each entry in this list corresponds to a split point which is described in Autosplitter.json. The true/false value for each one determines whether that split point will be used. The names for each split point will hopefully be descriptive enough that you can tell what they're referring to, but if not the author of the autosplitter may have made further information avaialable somewhere. Change these settings to your liking, and save the file. If the game is running when you make these changes, make sure to reset the game with F5 in order for your changes to take effect.

## Compatability
This should work for most MV games, as it just hooks into features of the engine and not anything game specific. It would only break if a game used a plugin which drastically changed parts of the engine code which this plugin interacts with. Below is a list of games which are confirmed working/non working:

| Game        | Working |
--------------|----------
| Ib (Remake) | YES     |
## Writing an autosplitter
TODO: Write this section
