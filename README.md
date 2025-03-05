<div align="center">

<h1>Lost City - RuneScript Language Extension</h1>

[Website](https://2004.lostcity.rs) | [Discord](https://discord.lostcity.rs) | [Forums](https://lostcity.rs) | [Rune-Server](https://www.rune-server.ee/runescape-development/rs2-server/projects/701698-lost-city-225-emulation.html)

</div>

## Features

* Syntax highlighting for all file formats
* Recoloring configs using a color picker
* Goto definitions (ctrl+click)
* Info displayed on hover
* Find all references
* Rename symbol
* Autocomplete suggestions
  * Type normal trigger to open autofill suggestions for that category (i.e. '~' opens proc autofill suggestions)
  * Type backtick (`) to open a list of possible autofill categories to choose from
  * Type double backtick (``) to automatically determine autofill suggestion category, or falls back to command names if auto detection fails

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
