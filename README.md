# Eclipse zenoh administration tool

A graphical web based tool for zenoh administration.

This tool leverages the zenoh REST plugin. One zenoh router with the REST plugin loaded must be running in the system to use it.

-------------------------------
## Quick start

Clone this repository.

Open *index.html* in a web browser. 

Fill in the dialog window with the address of a running REST plugin and click *Connect*.

-------------------------------
## Build as standalone application

Clone this repository.

Make sure *npm* is installed.

Install *electron* and *electron-builder*:

```bash
$ npm install --save-dev electron electron-builder
```

Build:

```bash
$ npm run build
```

Find resulting app and packages in *dist* directory.
