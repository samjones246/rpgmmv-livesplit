# RPGMMV-LiveSplit
A plugin for RPG Maker MV games which adds LiveSplit server integration, enabling auto start, split, reset and load removal. Includes support for loading a game specific Autosplitter.json file, which describes desired split points for a game.

## Features
 - Auto start when 'New Game' is clicked on the main menu
 - Auto reset when pressing F5 to reload the game
 - Load removal, pauses the LiveSplit timer while the game is loading during scene transitions. LiveSplit must be using the 'Game Time' comparison for this to take effect.
 - Auto split, if an Autosplitter.json for the game is supplied. This file can describe split points using various mechanisms supported by this plugin. See 'Writing an autosplitter' below for more details.

## Installation
For installation, updates and managing autosplitters, use the GUI comapnion tool: https://www.github.com/samjones246/mv-livesplit-gui
