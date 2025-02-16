<div align="center">

<h1>2004Scape - RuneScript Language Extension</h1>

[Website](https://2004scape.org) | [Discord](https://discord.2004scape.org) | [Rune-Server](https://www.rune-server.ee/runescape-development/rs2-server/projects/701698-lost-city-225-emulation.html)

</div>

## Features

* Syntax highlighting for all file formats
* Recoloring configs using a color picker
* Goto definitions (ctrl+click)
* Info displayed on hover

## Installation
For VSCode, this extension can be installed directly from the marketplace.

For VSCodium, a little bit of extra work is needed:
```
git clone https://github.com/LostCityRS/RuneScriptLanguage.git
cd RuneScriptLanguage
npm install -g @vscode/vsce
vsce package
codium --install-extension runescriptlanguage-0.1.2.vsix
```

#### Coming soon™

* Find all references
* Rename symbol accross files
