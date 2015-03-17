var WebSocket = require('ws');
var EventEmitter = require('events').EventEmitter;
var Netmask = require('netmask').Netmask;
var os = require("os");
var util = require('util');
var network = require('network');


function NodeChilipeppr() {
    var self = this;
    this.connectedPort = null;
    this.spjsIsConnected = false;
    this.posx = 0;
    this.poxy = 0;
    this.posz = 0;
    this.posa = 0;

    this.feedrate = 0;
    this.spindle = 0;

    self.feed_hold = false;
    self.portsAvailable = [];
    self.serversAvailable = [];

};

util.inherits(NodeChilipeppr, EventEmitter);


NodeChilipeppr.prototype.scan = function (network, port) {
    var self = this;


    scancntsuccess = 0;
    scancnterr = 0;
    cnt = 0;

    subnet = '192.168.1.';

    //====================
    //Set the default Port
    //====================

    if (!port) {
        port = 8989;
    }


    for (var ctr = 1; ctr < 255; ctr++) {
        var conn = new WebSocket("ws://" + subnet + ctr + ":" + port + "/ws");
        var self = this;

        conn.on("open", function (evt) {
            scancntsuccess++;
            this.serversAvailable.push("ws://" + subnet + ctr + ":" + port + "/ws");
            this.emit("connection", {"type": "server_added", "value": "ws://" + subnet + ctr + ":" + port + "/ws"});
            console.log("found one:", "ws://" + subnet + ctr + ":" + port + "/ws");


        });

        conn.onerror = function (evt) {
            scancnterr++;
            console.log("Found " + scancntsuccess + ", Scanned " + (scancntsuccess + scancnterr));
        };
    }
    ;
}

NodeChilipeppr.prototype.processStatusReport = function (statusReport) {
    var self = this;

    //TODO:  We need to walk over the sr object now and parse values when present.


    //console.log("STATUS REPORT: ", statusReport);

    if (statusReport.sr.hasOwnProperty("unit")) {
        this.emit("change", statusReport.sr.dist);
    } else if(statusReport.sr.hasOwnProperty("stat") ) {
        if (statusReport.sr.stat == 6) {//6 is Feedhold AKA pause
            self.feed_hold = true;

            this.emit("control", {"feed_hold":true});
        }
        if (statusReport.sr.stat == 5) {

            self.feed_hold = false;
            this.emit("control", {"feed_hold":false});

        }
    }
};



NodeChilipeppr.prototype.send = function (message) {
    var self = this;
    if (!ws.readyState == 1) {
        self.emit("error", {"error": "websocket is not connected"});
    } else if (this.connectedPort == null) {
        self.emit("error", {"error": "spjs is not connected to any serial port"});
    } else {
        ws.send("send " + this.connectedPort + " " +message);
    }
};


NodeChilipeppr.prototype.findConnectedSerialPort = function (data) {
    //console.log("SerialPorts:",data.SerialPorts)
    for (p = 0; p <= data.SerialPorts.length; p++) {
        if (data.SerialPorts[p].IsOpen && data.SerialPorts[p].BufferAlgorithm == "tinyg") {
            console.log("Port Is Open: ", data.SerialPorts[p])
            this.connectedPort = data.SerialPorts[p].Name;
            this.spjsIsConnected = true;
            this.emit("connection", {"type": "connected", "name": this.connectedPort});
        }
    }
};

NodeChilipeppr.prototype.connect = function (server, port) {
    var self = this;
    //Open Websocket Server
    ws = new WebSocket("ws://" + server + ":" + port + "/ws");

    ws.on("message", function (data) {
        //this.processStat(data);
        //console.log("DATA:", data);
        try {
            data = JSON.parse(data);
            if (data.hasOwnProperty("D")) {
                try {
                    message = JSON.parse(data.D);
                    if (message.hasOwnProperty("sr")) {
                        //==============
                        //Status Report Posted
                        //==============
                        self.processStatusReport(message);
                    }
                } catch (err) {

                }
            } else if (data.hasOwnProperty("Version")) {
                console.log("VERSION: " + data.Version);
            } else if (data.hasOwnProperty("SerialPorts")) {
                self.findConnectedSerialPort(data);
            }
        } catch (err) {
            //NOT JSON

        }


        //self.processStatusReport(data);
        //self.emit('debug', data);
    });

    ws.onclose = this.OnClose;
    ws.on("open", function () {
        console.log("Opened Port: ");
        ws.send("list\n"); //We request a listing of ports on connect.
    });

};
module.exports = NodeChilipeppr;


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

