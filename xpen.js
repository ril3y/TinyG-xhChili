var HID = require("node-hid");
var WebSocket = require('ws');
var argv = require('optimist').argv;


var vendorId = 4302;
var productId = 60272;


//var dev = new HID.HID('USB_10ce_eb70_14100000');
var dev = new HID.HID(vendorId, productId);
var ws;
var serialport = "";
var isPaused = false;

const INCHES = 0;
const MM = 1;


var main = function () {


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


            if (message.hasOwnProperty("data")) {  //We always get the data attribute from SJPS
                try {
                    message = JSON.parse(message.data);
                    if (message.hasOwnProperty("Version")) {
                        //==============
                        //Version Posted
                        //==============
                        console.log("SPJS Server Version:" + message.Version);
                        ws.send("list\n");


                    } else if (message.hasOwnProperty("D")) {
                        //==================================
                        //Data Message Update
                        //==================================
                        //console.log("Status Report Update: ", message.D);
                        var message = JSON.parse(message.D);


                        //==================================
                        //FEEDHOLD Parsing / Units / State tracking code
                        //This code monitor for external requests to apply feed hold.
                        //With this we can do a feedhold in chilipeppr and then resume it from our pendant
                        //or do that in reverse.
                        if (message.hasOwnProperty("sr")) {
                            if (message.sr.hasOwnProperty("stat")) {
                                if (message.sr.stat == 6) {//6 is Feedhold AKA pause
                                    isPaused = true;
                                }
                                if (message.sr.stat == 5) {
                                    isPaused = false;
                                }
                            }
                            //END Feed Hold Tracking Code
                            //==================================

                            else if (message.sr.hasOwnProperty("unit")) {
                                if (message.sr.unit == MM) { //1 == mm
                                    units = MM;
                                } else {                    //0 = inches
                                    units = INCHES;
                                }
                                console.log("Changed Units to: " + units);
                            }
                            //END Units Tracking Code
                            //==================================

                        }
                    } else if (message.hasOwnProperty("Commands")) {
                        //console.log("Command Message Recvd ", message);
                    } else if (message.hasOwnProperty("close")) {
                        console.log("Close Message Recvd", message);
                    } else if (message.hasOwnProperty("SerialPorts")) {
                        //console.log("Setting Serial Ports", message);
                        for (i = 0; i < message.SerialPorts.length; i++) {
                            if (message.SerialPorts[i].BufferAlgorithm == "tinyg") {
                                serialport = message.SerialPorts[i].Name;
                                console.log("\t==>Set Serial Port: " + serialport);
                            }

                        }
                    }
                    else if (message.hasOwnProperty("Error")) {
                        console.log("Error Message:", message);
                    }
                    else {
                        //Default Case when not sure of the message
                        //console.log("RECV DATA <==:", message);
                    }
                }
                catch (e) {
                    //console.log("ERROR PARSING: ", e); //Just ignore the non json messages
                }
            }


            else if (message.hasOwnProperty("debug")) {
                console.log("Debugging Data", message);
            }
        }//end on message data


    }
    else {
        console.log("ERROR: Please supply a SPJS server!");
        process.exit()
    }


    dev.on("data", function (data) {
        console.log("DATA:", data);
        parseDataPacket(data);

    });


    //--------------------------

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

        {name: "keyup", value: [0x00, 0x9a], tinyg: "\n"},
        {name: "reset", value: [0x17, 0x8d], tinyg: "None"},
        {name: "sleep", value: [0x00, 0x00], tinyg: "None"},
        {name: "stop", value: [0x16, 0x8c], tinyg: "!\n%\n"},
        {name: "arrow1", value: [0x01, 0x9b], tinyg: "g28.3x0y0z0a0\n"}, //Set Zero
        {name: "arrow2", value: [0x09, 0x93], tinyg: "g0x0y0z0a0\n"}, //Go to zero
        {name: "rewind", value: [0x03, 0x99], tinyg: "None"},
        {name: "spindle", value: [0x0c, 0x96], tinyg: "None"},
        {name: "half", value: [0x06, 0x9c], tinyg: "None"},
        {name: "zero", value: [0x07, 0x9d], tinyg: "g28.3"},
        {name: "pause_resume", value: [0x02, 0x98], tinyg: "~ || !"},
        {name: "probez", value: [0x04, 0x9e], tinyg: "g28.3z0"},
        {name: "safez", value: [0x08, 0x92], tinyg: "g92"},
        {name: "step++", value: [0x0d, 0x97], tinyg: "\n"},
        {name: "model", value: [0x0e, 0x94]},
        {name: "half", value: [0x03, 0x99], tinyg: "None"}
    ];

    var sendStopFlush = function () {
        sendToSPJS("!\n%\n")
    }

    var parseCommand = function (data) {
        for (i = 0; i < CMDS.length; i++) {
            if (data[CMD_BYTE1] == CMDS[i].value[0] && data[CMD_BYTE2] == CMDS[i].value[1]) {

                if (data[CMD_VELOCITY] != 0x00) {
                    //We got a velocity, Now this is a JOG command vs a Keyup command.
                    return ({name: "jog", value: [0x00, data[CMD_VELOCITY], 0x9a], tinyg: "g1f100"})
                }

                return (CMDS[i]);

            } //eek!


        }
        return null;
    };

    var count = 15;
    var isJogging = false;
    var jogMode = "incremental"; //vs "continuous"
    var units = "mm";
    var stepDistance = 0;
    var jogVelocityMultiplier = 1;
    var velocityMin = 40; //mm/min
    var calculatedVelocity = velocityMin;
    var distanceTable = [0.1, 0.01, 0.001];



//var stepDistance = stepDistances[0];
//var stepDistances = [
//    {"one":1},
//    {"tenth":0.1},
//    {"hundreds": 0.001},
//    {"thousand":0.0001} ];


    //=================================================================================================
    //
    //                                    ---> JOGGING CODE HERE <---
    //
    //=================================================================================================

    //Continuous is the machine will continue to jog as long as there are event dial events coming in.
    var doJogContinuous = function (dialSetting, cmd) {
        //build our jog command

        _velocity = cmd.value[1];
        //We need to figure out if this is a negative move or a positive move
        if (_velocity > 0xaa) {
            sign = "-";
            _velocity = 255 - _velocity; // When rotating counter clockwise the velocity
            //Comes in as 0xfe for 1 which we will subtract from 0xff to get a sane number
        } else {
            sign = ""
        }


        tmpCalc = (_velocity * 10) * velocityMin;
        if(tmpCalc > calculatedVelocity){
            calculatedVelocity = tmpCalc; //If we are moving faster than previously we will increase our speed.
        }

        console.log("SANE VELOCITY: " + _velocity);


        cmd.tinyg = "g91\ng1F" + calculatedVelocity + dialSetting + sign + count + "\n";
        return (cmd);
    };

    //Incremental Will only single step then stop and wait for another click of the jog dial.
    var doJogIncremental = function (dialSetting, cmd) {
        //build our jog command

        //We need to figure out if this is a negative move or a positive move
        if (cmd.value[1] > 0xaa) {
            sign = "-";
        } else {
            sign = ""
        }


        cmd.tinyg = "g91\ng1F5" + dialSetting + sign + getStepDistance() + "\n";
        return (cmd);
    };


    var getStepDistance = function(){
        return distanceTable[stepDistance];
    };

    var setStepDistance = function () {
        stepDistance = stepDistance + 1;

        //We only have 3 values in the array for distanceTable
        //So if its 3 lets reset it back to 0
        if (stepDistance == 3) {
            stepDistance = 0;
        }
    };
    //=================================================================================================
    //======================================= END JOG CODE ============================================
    //=================================================================================================


//This is our generic send method
    var sendToSPJS = function (cmdString) {
        if (ws.readyState == 1) {
            //readystate == 1 means the websocket is open so we will try to write ot it.
            console.log("Sending to Websocket: " + cmdString);
            ws.send("send " + serialport + " " + cmdString);
        }
    }


    var parseDataPacket = function (data) {
        if (data[CMD_START_BYTE] == 0x04) { //0x04 is a constant for this device as the first byte
            dialSetting = getDialSetting(data[CMD_AXIS_BYTE]);
            _tmpCmd = parseCommand(data);


            if (_tmpCmd && dialSetting != "DIAL OFF") {
                console.log("DIAL: " + dialSetting + " Command: " + _tmpCmd.name, " TinyG: " + _tmpCmd.tinyg);


                switch (_tmpCmd.name) {


                    case("keyup"):
                        //If we were jogging we are in incremental mode
                        //We need to exit this mode now that we are done jogging.
                        if (isJogging) {
                            isJogging = false;

                            //What this does is if you are in continuous mode you will move until
                            //you stop twisting the dial.  This will then issue a feedhold flush command.
                            if (jogMode == "continuous") {
                                sendStopFlush();
                                calculatedVelocity = velocityMin;
                            }

                            sendToSPJS("g90\n")
                            console.log("::-----Exiting Jog Mode------::");
                        }
                        break;

                    case("jog"):
                        console.log("::-----Entering Jog Mode------::");
                        isJogging = true;
                        if (jogMode == "incremental") {
                            _tmpCmd = doJogIncremental(dialSetting, _tmpCmd);
                        } else {
                            _tmpCmd = doJogContinuous(dialSetting, _tmpCmd);
                        }
                        //command is build send it out
                        sendToSPJS(_tmpCmd.tinyg);
                        break;

                    case("pause_resume"):
                        if (isPaused) {
                            console.log("Sending Resume");
                            sendToSPJS("~\n");
                        } else {
                            sendToSPJS("!\n");
                            console.log("Sending Feedhold/Pause");
                        }
                        break;

                    case("zero"):
                        sendToSPJS(_tmpCmd.tinyg + dialSetting + "0\n");
                        break;

                    case("arrow2"): //Arrow2 is, at least for now go to zero on all axis
                        sendToSPJS(_tmpCmd.tinyg);
                        break;

                    case("step++"):
                        console.log("Changing Step Rate for Incremental Mode");
                        console.log("\t " + getStepDistance());
                        break;

                    case("model"):
                        console.log("-----Changing Jog Modes----");
                        if (jogMode == "incremental") {
                            jogMode = "continuous";
                        } else {
                            jogMode = "incremental";
                        }
                        console.log("MODE: " + jogMode);
                        break;

                    default:
                        console.log("Un-Caught Case: " + _tmpCmd.name, _tmpCmd.value);
                        break;


                }


            } else {
                console.log("DIAL: " + dialSetting + " Command Code Unknown: ", data);

            }
        }
    };

}


//==================================================
//COMMANDS
//==================================================

//
//var COMMANDS = [ ENDJOG = new Buffer([0x4, 0x0, 0x0, 0x11, 00, 0x9a]),
//                SLEEP = new Buffer([0x4, 0x0, 0x0, 0x0, 0x0, 0x0]),
//                RESET = new Buffer([0x4, 0x17, 0x0, 0x11, 0x0, 0x8d]),

//var MACRO2 = new Buffer([0x4, 0xb, 0x0, 0x11, 0x0 0x91>]);

//var COMMANDS = [
//    {name: "RESET", value: new Buffer([0x4, 0x17, 0x00, 0x11, 0x00, 0x8d])},
//    {name: "SLEEP", vvalue: new Buffer([0x4, 0x0, 0x00, 0x00, 0x00, 0x0])},
//    {name: "KEYUP", value: new Buffer([0x4, 0x00, 0x00, 0x11, 0x00, 0x9a])},
//    {name: "PROBEZ", value: new Buffer([0x4, 0x4, 0x00, 0x11, 0x00, 0x9e])},
//    {name: "STOP", value: new Buffer([0x4, 0x16, 0x00, 0x11, 0x00, 0x8c])},
//    {name: "ARROW1", value: new Buffer([0x4, 0x1, 0x00, 0x11, 0x00, 0x9b])},
//    {name: "STARTPAUSE", value: new Buffer([0x4, 0x2, 0x00, 0x11, 0x00, 0x98])},
//    {name: "REWIND", value: new Buffer([0x4, 0x3, 0x00, 0x11, 0x00, 0x99])},
//    {nme: "SPINDLE", value: new Buffer([0x4, 0xc, 0x00, 0x11, 0x00, 0x96])},
//    {name: "HALF", value: new Buffer([0x4, 0x6, 0x00, 0x11, 0x00, 0x9c])},
//    {nme: "SETZERO", value: new Buffer([0x4, 0x7, 0x00, 0x11, 0x00, 0x9d])},
//    {name: "SAFEZ", value: new Buffer([0x4, 0x8, 0x00, 0x11, 0x00, 0x92])},
//    {name: "ARROW2", value: new Buffer([0x4, 0xa, 0x00, 0x11, 0x00, 0x90])},
//    {name: "MACRO1", value: new Buffer([0x4, 0x0a, 0x00, 0x11, 0x00, 0x90])},
//    {name: "MACRO2", value: new Buffer([0x4, 0x0b, 0x00, 0x11, 0x00, 0x91])},
//    {name: "MACRO3", value: new Buffer([0x4, 0x05, 0x00, 0x11, 0x00, 0x9f])},
//    {name: "STEP++", value: new Buffer([0x4, 0xd, 0x00, 0x11, 0x00, 0x97])},
//    {na: "MPGMODEL", value: new Buffer([0x4, 0xe, 0x00, 0x11, 0x00, 0x94])},
//
//    {name: "MACRO6", value: new Buffer([0x4, 0x0f, 0x00, 0x11, 0x00, 0x95])},
//    {name: "MACRO7", value: new Buffer([0x4, 0x10, 0x00, 0x11, 0x00, 0x8a])},
//    {nme: "DIALOFF", value: new Buffer([0x4, 0x00, 0x00, 0x00, 0x00, 0x9a])},
//    //{name:"DIALX", value:new Buffer([0x4, 0x00, 0x00, 0x12, 0x00, 0x9a])},
//    {name: "DIALY", value: new Buffer([0x4, 0x4, 0x00, 0x11, 0x00, 0x9e])},
//    {name: "DIALZ", value: new Buffer([0x4, 0x4, 0x00, 0x11, 0x00, 0x9e])},
//    {name: "DIALA", value: new Buffer([0x4, 0x4, 0x00, 0x11, 0x00, 0x9e])},
//    {nam: "SPINDLE", value: new Buffer([0x4, 0x4, 0x00, 0x11, 0x00, 0x9e])},
//    {name: "FEED", value: new Buffer([0x4, 0x4, 0x00, 0x11, 0x00, 0x9e])},
//    {name: "ENDSEQ", value: new Buffer([0x4, 0xb, 0x0, 0x11, 0x0, 0x8d])}
//];


var repl = require("repl");


var replServer = repl.start({
    prompt: "xhcPen > "
});


main();


replServer.context.main = main;


//while(1){
//
//    dev.write([0x6,0xfe,0xfd, 0x02, 0x00, 0x00, 0x7c, 0x95]);
//    dev.write([0x6,0xa,0x80, 0x00, 0x00, 0x00, 0x00, 0x00]);
//}
//dev.write([0x6,0xfe,0xfd, 0x02, 0x00, 0x00, 0x7c, 0x95]);

//dev.write([0x6,0x00,0x00, 0x41, 0x91, 0x00, 0x00, 0x00]);

//dev.write([0x6,0x00,0x00, 0x00, 0x00, 0x00, 0x00, 0x39]); //This will set the F: to 57 0x39 == 57

//setup bytes for Spindle:
//dev.write([0x06, 0x0, 0x2,0x0, 0x0, 0x0, 0x3, 0x0]);
//set value packet for spindle:
// 06 00 00 00 00 00 00 48 //0x48 == 68


