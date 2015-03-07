var Debug = require("console-debug");

var XHC = require("./../node-xhc.js");
var x = new XHC();

var console = new Debug({
  uncaughtExceptionCatch: false, // Do we want to catch uncaughtExceptions?
  consoleFilter: [], // Filter these console output types, Examples: 'LOG', 'WARN', 'ERROR', 'DEBUG', 'INFO'
  logToFile: true, // if true, will put console output in a log file folder called 'logs'
  logFilter: ['LOG', 'DEBUG', 'INFO'], // Examples: Filter these types to not log to file, Examples: 'LOG', 'WARN', 'ERROR', 'DEBUG', 'INFO'
  colors: true // do we want pretty pony colors in our console output?
});


x.on("key_press",function(data){
  console.info("KEY_PRESS: " + JSON.stringify(data));
    x.test(true);
});

x.on("jog", function(data){
    console.info("JOGGING: " + JSON.stringify(data));
});

x.on("change", function(data){
    console.info("CHANGE: " + JSON.stringify(data));
});


