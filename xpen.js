var HID = require("node-hid");
var WebSocket = require('ws');
var argv = require('optimist').argv;



var vendorId = 4302;
var productId = 60272;


//var dev = new HID.HID('USB_10ce_eb70_14100000');
var dev = new HID.HID(vendorId, productId);
var ws;
var serialport = "";

var main = function() {


    if (argv.spjsServer != null) {
        console.log("Attempting to connect to SPSJ Server: " + argv.spjsServer)
        //Open Websocket Server
        ws = new WebSocket("ws://" + argv.spjsServer + ":8989/ws");

        //Handel Open Websocket
        ws.onopen = function () {
            console.log("SPJS Server Connected:")
        }

        //Data Events from Websocket
        ws.onmessage = function (message) {

            //==============
            //Version Posted
            //==============


            if (message.hasOwnProperty("data")) {  //We always get the data attribute from SJPS
                try {
                    message = JSON.parse(message.data);
                    if (message.hasOwnProperty("Version")) {
                        console.log("SPJS Server Version:" + message.Version);
                        ws.send("list\n");
                    } else if (message.hasOwnProperty("D")) {
                        //=======================
                        //Data Message Update
                        //=======================
                        console.log("Status Report Update: ", message.D);

                    } else if (message.hasOwnProperty("Commands")) {
                        //console.log("Command Message Recvd ", message);
                    } else if (message.hasOwnProperty("close")) {
                        console.log("Close Message Recvd", message);
                    } else if (message.hasOwnProperty("SerialPorts")) {
                        //console.log("Setting Serial Ports", message);
                        for(i=0; i<message.SerialPorts.length; i++){
                            if(message.SerialPorts[i].BufferAlgorithm == "tinyg"){
                                serialport = message.SerialPorts[i].Name;
                                console.log("\t==>Set Serial Port: " + serialport);
                            }

                        }

                    }else {
                        //Default Case when not sure of the message
                        console.log("RECV DATA <==:", message);
                    }

                } catch (e) {
                   // console.log("ERROR PARSING: ", e); //Just ignore the non json messages
                }
            }
        }//end on message data
    } else {
        console.log("ERROR: Please supply a SPJS server!");
        process.exit()
    }


    dev.on("data", function (data) {
        parseDataPacket(data);

    });

}



//==================================================
//COMMANDS
//==================================================

//
//var COMMANDS = [ ENDJOG = new Buffer([0x4, 0x0, 0x0, 0x11, 00, 0x9a]),
//                SLEEP = new Buffer([0x4, 0x0, 0x0, 0x0, 0x0, 0x0]),
//                RESET = new Buffer([0x4, 0x17, 0x0, 0x11, 0x0, 0x8d]),

//var MACRO2 = new Buffer([0x4, 0xb, 0x0, 0x11, 0x0 0x91>]);

var COMMANDS = [
    {name: "RESET", value: new Buffer([0x4, 0x17, 0x00, 0x11, 0x00, 0x8d])},
    {name: "SLEEP", vvalue: new Buffer([0x4, 0x0, 0x00, 0x00, 0x00, 0x0])},
    {name: "KEYUP", value: new Buffer([0x4, 0x00, 0x00, 0x11, 0x00, 0x9a])},
    {name: "PROBEZ", value: new Buffer([0x4, 0x4, 0x00, 0x11, 0x00, 0x9e])},
    {name: "STOP", value: new Buffer([0x4, 0x16, 0x00, 0x11, 0x00, 0x8c])},
    {name: "ARROW1", value: new Buffer([0x4, 0x1, 0x00, 0x11, 0x00, 0x9b])},
    {name: "STARTPAUSE", value: new Buffer([0x4, 0x2, 0x00, 0x11, 0x00, 0x98])},
    {name: "REWIND", value: new Buffer([0x4, 0x3, 0x00, 0x11, 0x00, 0x99])},
    {nme: "SPINDLE", value: new Buffer([0x4, 0xc, 0x00, 0x11, 0x00, 0x96])},
    {name: "HALF", value: new Buffer([0x4, 0x6, 0x00, 0x11, 0x00, 0x9c])},
    {nme: "SETZERO", value: new Buffer([0x4, 0x7, 0x00, 0x11, 0x00, 0x9d])},
    {name: "SAFEZ", value: new Buffer([0x4, 0x8, 0x00, 0x11, 0x00, 0x92])},
    {name: "ARROW2", value: new Buffer([0x4, 0xa, 0x00, 0x11, 0x00, 0x90])},
    {name: "MACRO1", value: new Buffer([0x4, 0x0a, 0x00, 0x11, 0x00, 0x90])},
    {name: "MACRO2", value: new Buffer([0x4, 0x0b, 0x00, 0x11, 0x00, 0x91])},
    {name: "MACRO3", value: new Buffer([0x4, 0x05, 0x00, 0x11, 0x00, 0x9f])},
    {name: "STEP++", value: new Buffer([0x4, 0xd, 0x00, 0x11, 0x00, 0x97])},
    {na: "MPGMODEL", value: new Buffer([0x4, 0xe, 0x00, 0x11, 0x00, 0x94])},

    {name: "MACRO6", value: new Buffer([0x4, 0x0f, 0x00, 0x11, 0x00, 0x95])},
    {name: "MACRO7", value: new Buffer([0x4, 0x10, 0x00, 0x11, 0x00, 0x8a])},
    {nme: "DIALOFF", value: new Buffer([0x4, 0x00, 0x00, 0x00, 0x00, 0x9a])},
    //{name:"DIALX", value:new Buffer([0x4, 0x00, 0x00, 0x12, 0x00, 0x9a])},
    {name: "DIALY", value: new Buffer([0x4, 0x4, 0x00, 0x11, 0x00, 0x9e])},
    {name: "DIALZ", value: new Buffer([0x4, 0x4, 0x00, 0x11, 0x00, 0x9e])},
    {name: "DIALA", value: new Buffer([0x4, 0x4, 0x00, 0x11, 0x00, 0x9e])},
    {nam: "SPINDLE", value: new Buffer([0x4, 0x4, 0x00, 0x11, 0x00, 0x9e])},
    {name: "FEED", value: new Buffer([0x4, 0x4, 0x00, 0x11, 0x00, 0x9e])},
    {name: "ENDSEQ", value: new Buffer([0x4, 0xb, 0x0, 0x11, 0x0, 0x8d])}
];


//=====================
//CMD Byte Packet Names
//=====================
var CMD_START_BYTE = 0;
var CMD_BYTE1 = 1;
var CMD_PADDING = 2;
var CMD_AXIS_BYTE = 3;
var CMD_VELOCITY = 4;
var CMD_BYTE2 = 5;


//=====================
//DIAL Modes
//=====================
var OFF_DIAL = 0x00;
var X_AXIS = 0x11;
var Y_AXIS = 0x12;
var Z_AXIS = 0x13;
var A_AXIS = 0x18;
var SPINDLE_DIAL = 0x14;
var FEED_DIAL = 0x15;

var getDialSetting = function (dialByte) {
    switch (dialByte) {
        case(OFF_DIAL):
            return ("DIAL OFF");
        case(X_AXIS):
            return ("X");
        case(Y_AXIS):
            return ("Y");
        case(Z_AXIS):
            return ("Z");
        case(A_AXIS):
            return ("A");
        case(SPINDLE_DIAL):
            return ("SPINDLE");
        case(FEED_DIAL):
            return ("FEED");
    }
};




var CMDS = [

    {name: "keyup", value: [0x00, 0x9a], tinyg: "None"},
    {name: "reset", value: [0x17, 0x8d], tinyg: "None"},
    {name: "sleep", value: [0x00, 0x00], tinyg: "None"},
    {name: "stop", value: [0x16, 0x8c], tinyg: "!\n%\n"},
    {name: "arrow1", value: [0x01, 0x9b], tinyg: "None"},
    {name: "rewind", value: [0x03, 0x99], tinyg: "None"},
    {name: "spindle", value: [0x0c, 0x96], tinyg: "None"},
    {name: "half", value: [0x06, 0x9c], tinyg: "None"},
    {name: "zero", value: [0x07, 0x9d], tinyg: "g28.3"},
    {name: "pause_resume", value: [0x02, 0x98], tinyg: "~ || !"},
    {name: "probez", value: [0x04, 0x9e], tinyg: "g28.3z0"},
    {name: "safez", value: [0x08, 0x92], tinyg: "g92"},
    {name: "half", value: [0x03, 0x99], tinyg: "None"}
];


var parseCommand = function (data) {
    for (i = 0; i < CMDS.length; i++) {
        if (data[CMD_BYTE1] == CMDS[i].value[0] && data[CMD_BYTE2] == CMDS[i].value[1]) {

            if(data[CMD_VELOCITY] != 0x00){
                //We got a velocity, Now this is a JOG command vs a Keyup command.
                return({name:"jog", value: [0x00,data[CMD_VELOCITY], 0x9a], tinyg:"g1f100" })
            }

            return (CMDS[i]);

        } //eek!
        //console.log("COMMAND: " + CMDS[i].name);


    }
    return null;
};

var velocity = 1;
var count = 1;
var isJogging = false;

var doJog = function(dialSetting, cmd){
    //build our jog command

    //We need to figure out if this is a negative move or a positive move
    if(cmd.value[1] > 0xaa ){
        sign = "-";
    }else{
        sign=""
    }

    velocity = cmd.value[1] + velocity*2;
    cmd.tinyg = "g91\ng1F200"+dialSetting+sign+count+"\n";
    return(cmd);
}




var parseDataPacket = function (data) {
    if (data[CMD_START_BYTE] == 0x04) { //0x04 is a constant for this device as the first byte
        dialSetting = getDialSetting(data[CMD_AXIS_BYTE]);
        _tmpCmd = parseCommand(data);


        if (_tmpCmd) {
            console.log("DIAL: " + dialSetting + " Command: " + _tmpCmd.name, " TinyG: " + _tmpCmd.tinyg);

            //We got a jog command now we need to do it!
            if(_tmpCmd.name == "jog" && dialSetting != "DIAL OFF"){
                isJogging = true
                _tmpCmd = doJog(dialSetting, _tmpCmd);
                console.log("JOG", _tmpCmd);

            }

            if(ws.readyState == 1 && _tmpCmd.tinyg != "None") {
                //readystate == 1 means the websocket is open so we will try to write ot it.
                console.log("Sending to Websocket: " +"send " + serialport +" "+ _tmpCmd.tinyg);
                ws.send("send " + serialport +" "+ _tmpCmd.tinyg);

            }
        } else {
            console.log("DIAL: " + dialSetting + " Command Code Unknown: ", data);

        }
    }
};




main();