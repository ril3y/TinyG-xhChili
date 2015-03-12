var WebSocket = require('ws');
var Debug = require("console-debug");
var EventEmitter = require('events').EventEmitter;
var Netmask = require('netmask').Netmask;
var os = require("os");

var console = new Debug({
    uncaughtExceptionCatch: false, // Do we want to catch uncaughtExceptions?
    consoleFilter: [], // Filter these console output types, Examples: 'LOG', 'WARN', 'ERROR', 'DEBUG', 'INFO'
    logToFile: true, // if true, will put console output in a log file folder called 'logs'
    logFilter: ['LOG', 'DEBUG', 'INFO'], // Examples: Filter these types to not log to file, Examples: 'LOG', 'WARN', 'ERROR', 'DEBUG', 'INFO'
    colors: true // do we want pretty pony colors in our console output?
});


var NodeChilipeppr = function () {
    EventEmitter.call(this);


    //=====================
    // Defines
    //=====================


    //=====================
    //CMD Byte Packet Names
    //=====================


};

util.inherits(NodeChilipeppr, EventEmitter);

NodeChilipeppr.prototype.scan = function () {
    networks = os.networkInterfaces();

    for (i = 0; i < networks.length; i++) {  //loops through interfaces
        //for(n=0; n<networks[i].length; n++){ //loops through addresses on interfaces
        //    if(networks[i][n].hasOwnProperty)
        console.debug("NET: " + networks[i]);
    }


};

//ws = new WebSocket("ws://" + argv.spjsServer + ":8989/ws");
//
////Handel Open Websocket
//ws.onopen = function () {
//    console.log("SPJS Server Connected:")
//};

//Data Events from Websocket
//ws.onmessage = function (message) {
//
//
//    if (message.hasOwnProperty("data")) {  //We always get the data attribute from SJPS
//        try {
//            message = JSON.parse(message.data);
//            if (message.hasOwnProperty("Version")) {
//                //==============
//                //Version Posted
//                //==============
//                console.log("SPJS Server Version:" + message.Version);
//                ws.send("list\n");
//
//
//            } else if (message.hasOwnProperty("D")) {
//                //==================================
//                //Data Message Update
//                //==================================
//                //console.log("Status Report Update: ", message.D);
//                var message = JSON.parse(message.D);
//
//
//                //==================================
//                //FEEDHOLD Parsing / Units / State tracking code
//                //This code monitor for external requests to apply feed hold.
//                //With this we can do a feedhold in chilipeppr and then resume it from our pendant
//                //or do that in reverse.
//                if (message.hasOwnProperty("sr")) {
//                    if (message.sr.hasOwnProperty("stat")) {
//                        if (message.sr.stat == 6) {//6 is Feedhold AKA pause
//                            isPaused = true;
//                        }
//                        if (message.sr.stat == 5) {
//                            isPaused = false;
//                        }
//                    }
//                    //END Feed Hold Tracking Code
//                    //==================================
//
//                    else if (message.sr.hasOwnProperty("unit")) {
//                        if (message.sr.unit == MM) { //1 == mm
//                            units = MM;
//                        } else {                    //0 = inches
//                            units = INCHES;
//                        }
//                        console.log("Changed Units to: " + units);
//                    }
//                    //END Units Tracking Code
//                    //==================================
//
//                }
//            } else if (message.hasOwnProperty("Commands")) {
//                //console.log("Command Message Recvd ", message);
//            } else if (message.hasOwnProperty("close")) {
//                console.log("Close Message Recvd", message);
//            } else if (message.hasOwnProperty("SerialPorts")) {
//                //console.log("Setting Serial Ports", message);
//                for (i = 0; i < message.SerialPorts.length; i++) {
//                    if (message.SerialPorts[i].BufferAlgorithm == "tinyg") {
//                        serialport = message.SerialPorts[i].Name;
//                        console.log("\t==>Set Serial Port: " + serialport);
//                    }
//
//                }
//            }
//            else if (message.hasOwnProperty("Error")) {
//                console.log("Error Message:", message);
//            }
//            else {
//                //Default Case when not sure of the message
//                //console.log("RECV DATA <==:", message);
//            }
//        }
//        catch (e) {
//            //console.log("ERROR PARSING: ", e); //Just ignore the non json messages
//        }
//    }
//
//
//    else if (message.hasOwnProperty("debug")) {
//        console.log("Debugging Data", message);
//    }
//};

module.exports = NodeChilipeppr;