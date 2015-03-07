var HID = require("node-hid");
var WebSocket = require('ws');
var argv = require('optimist').argv;
var Debug = require("console-debug");
var EventEmitter = require('events').EventEmitter;
var util = require('util');


var console = new Debug({
    uncaughtExceptionCatch: false, // Do we want to catch uncaughtExceptions?
    consoleFilter: [], // Filter these console output types, Examples: 'LOG', 'WARN', 'ERROR', 'DEBUG', 'INFO'
    logToFile: true, // if true, will put console output in a log file folder called 'logs'
    logFilter: ['LOG', 'DEBUG', 'INFO'], // Examples: Filter these types to not log to file, Examples: 'LOG', 'WARN', 'ERROR', 'DEBUG', 'INFO'
    colors: true // do we want pretty pony colors in our console output?
});


var Xpen = function () {
    EventEmitter.call(this);
    isPaused = false;
    isJogging = false;
    stepDistance = 0;
    distanceTable = [0.1, 0.01, 0.001];
    jogMode = "incremental"; //vs "continuous"
    velocityMin = 40; //mm/min
    calculatedVelocity = velocityMin;



    this.vendorId = 4302;
    this.productId = 60272;


    //=====================
    // Defines
    //=====================
    this.INCHES = 0;
    this.MM = 1;
    this.units = this.MM;


    //=====================
    //CMD Byte Packet Names
    //=====================
    CMD_START_BYTE = 0;
    CMD_BYTE1 = 1;
    CMD_PADDING = 2;
    CMD_DIAL_BYTE = 3;
    CMD_VELOCITY = 4;
    CMD_BYTE2 = 5;


    CMDS = [

        {
            name: "keyup",
            value: [0x00, 0x9a]
        },
        {
            name: "reset",
            value: [0x17, 0x8d]
        },
        {
            name: "sleep",
            value: [0x00, 0x00]
        },
        {
            name: "stop",
            value: [0x16, 0x8c]
        },
        {
            name: "arrow1",
            value: [0x01, 0x9b]
        }, //Set Zero
        {
            name: "arrow2",
            value: [0x09, 0x93]
        }, //Go to zero
        {
            name: "rewind",
            value: [0x03, 0x99]
        },
        {
            name: "spindle",
            value: [0x0c, 0x96]
        },
        {
            name: "macro_1",
            value: [0x0a, 0x90]
        },
        {
            name: "macro_2",
            value: [0x0b, 0x91]
        },
        {
            name: "macro_3",
            value: [0x05, 0x9f]
        },
        {
            name: "macro_6",
            value: [0x0f, 0x95]
        },
        {
            name: "macro_7",
            value: [0x10, 0x8a]
        },
        {
            name: "half",
            value: [0x06, 0x9c]
        },
        {
            name: "zero",
            value: [0x07, 0x9d]
        },
        {
            name: "pause_resume",
            value: [0x02, 0x98]
        },
        {
            name: "probez",
            value: [0x04, 0x9e]
        },
        {
            name: "safez",
            value: [0x08, 0x92]
        },
        {
            name: "step++",
            value: [0x0d, 0x97]
        },
        {
            name: "model",
            value: [0x0e, 0x94]
        },
        {
            name: "half",
            value: [0x03, 0x99]
        }
    ];


    //=====================
    //DIAL Modes
    //=====================
    OFF_DIAL = 0x00;
    X_AXIS = 0x11;
    Y_AXIS = 0x12;
    Z_AXIS = 0x13;
    A_AXIS = 0x18;
    SPINDLE_DIAL = 0x14;
    FEED_DIAL = 0x15;

    //=====================
    //INIT COde
    //=====================
    this._findAndConnectPendant();

};

util.inherits(Xpen, EventEmitter);

Xpen.prototype._findAndConnectPendant = function () {
    var self = this;
    try {
        var dev = new HID.HID(this.vendorId, this.productId);
        dev.on("data", function (data) {
            //_dial = _getDialSetting(data[CMD_DIAL_BYTE]);
            _packet = parseDataPacket(data);
            if (_packet != null) {
                //This emits the type of packet and the packet data to whatever code is
                //listening to the xhc module
                self.emit(_packet.type, _packet);
            }
        });

    } catch (err) {
        console.error("Unable to locate pendant... Check USB pendant is plugged in.");
    }
};

var parseCommand = function (data) {
    for (i = 0; i < CMDS.length; i++) {
        if (data[CMD_BYTE1] == CMDS[i].value[0] && data[CMD_BYTE2] == CMDS[i].value[1]) {


            //The Key Up command looks identical to a "jog" dial movement vs.
            //The 2nd to last byte if its a not 0 value it makes this key_up command a jog.
            if (data[CMD_VELOCITY] != 0x00) {
                return ({
                    name: "jog",
                    value: [0x00, data[CMD_VELOCITY], 0x9a]
                })
            }
            return (CMDS[i]);
        } //eek!


    }
    return null;
};

var _getDialSetting = function (dialByte) {
    //  console.warn(X_AXIS);
    //  console.warn(dialByte);
    switch (dialByte) {
        case (OFF_DIAL):
            return ("DIAL OFF");
        case (X_AXIS):
            return ("X");
        case (Y_AXIS):
            return ("Y");
        case (Z_AXIS):
            return ("Z");
        case (A_AXIS):
            return ("A");
        case (SPINDLE_DIAL):
            return ("SPINDLE");
        case (FEED_DIAL):
            return ("FEED");
        default:
            return ("Unknown Dial State");
    }
};

//=================================================================================================
//
//                                    ---> JOGGING CODE HERE <---
//
//=================================================================================================


var getJogDirectionVelocity = function (data) {
    _velocity = data[CMD_VELOCITY];
    //We need to figure out if this is a negative move or a positive move
    if (_velocity > 0xaa) {
        sign = "-";
        _velocity = 255 - _velocity; // When rotating counter clockwise the velocity
        //Comes in as 0xfe for 1 which we will subtract from 0xff to get a sane number
    } else {
        sign = "+"
    }

    return ([sign, _velocity]);
};


 var _resetVelocities = function(){
    calculatedVelocity = velocityMin;

}
//Continuous is the machine will continue to jog as long as there are event dial events coming in.
var calculateContinuousVelocity = function (vel) {
    //build our jog command

    tmpCalc = (vel * 10) * velocityMin;
    if (tmpCalc > calculatedVelocity) {
        calculatedVelocity = tmpCalc; //If we are moving faster than previously we will increase our speed.
    }
    return (calculatedVelocity);
};


var parseDataPacket = function (data) {
    if (data[CMD_START_BYTE] == 0x04) { //0x04 is a constant for this device as the first byte
        dialSetting = _getDialSetting(data[CMD_DIAL_BYTE]);
        _tmpCmd = parseCommand(data);


        if (_tmpCmd && dialSetting != "DIAL OFF") {

            switch (_tmpCmd.name) {
                case ("keyup"):
                    //keyup is a weird name for this event in regards to jogging but its the same
                    //as lifting a key after press.  So this why we must keep state on jogging.

                    //If we were jogging we are in incremental mode
                    //We need to exit this mode now that we are done jogging.
                    if (isJogging) {
                        isJogging = false;

                        //What this does is if you are in continuous mode you will move until
                        //you stop twisting the dial.  This will then issue a feedhold flush command.

                        _resetVelocities();
                        //We need to reset the velocity vaules to the min again.
                        if (jogMode == "continuous") {
                            return ({
                                'type': 'jog',
                                'dialSetting': dialSetting,
                                'cmd': "jog_stop"
                            });
                            break;
                        } else {
                            return ({
                                'type': 'jog',
                                'dialSetting': dialSetting,
                                'cmd': "jog_finish"
                            });
                            break;
                        }
                    }


                case ("jog"):
                    isJogging = true;
                    _dirvel = getJogDirectionVelocity(data);
                    dir = _dirvel[0];
                    vel = _dirvel[1];

                    if (jogMode == "incremental") { //Incremental Jog Sent
                        return ({
                            'type': 'jog',
                            'dialSetting': dialSetting,
                            'cmd': "jog_incremental",
                            'dir': dir,
                            'value': vel
                        });
                        break;

                    } else { //Continuous Mode Jog
                        return ({
                            'type': 'jog',
                            'dialSetting': dialSetting,
                            'cmd': "jog_continuous",
                            'dir': _dirvel[0],
                            'value': calculateContinuousVelocity(vel)
                        });
                        break;
                    }


                case ("pause_resume"):
                    if (isPaused) {
                        _name = "resume";
                    } else {
                        _name = "feedhold";
                    }
                    return ({
                        'type': 'key_press',
                        'dialSetting': dialSetting,
                        'cmd': _name //feedhold/resume
                    });
                    break;

                case ("zero"):
                    return ({
                        'type': 'key_press',
                        'dialSetting': dialSetting,
                        'cmd': _tmpCmd.name //zero
                    });
                    break;

                case ("half"):
                    return ({
                        'type': 'key_press',
                        'dialSetting': dialSetting,
                        'cmd': _tmpCmd.name //zero
                    });
                    break;
                case ("spindle"):
                    return ({
                        'type': 'key_press',
                        'dialSetting': dialSetting,
                        'cmd': _tmpCmd.name //zero
                    });
                    break;

                case ("rewind"):
                    return ({
                        'type': 'key_press',
                        'dialSetting': dialSetting,
                        'cmd': _tmpCmd.name //zero
                    });
                    break;

                case ("reset"):
                    return ({
                        'type': 'key_press',
                        'dialSetting': dialSetting,
                        'cmd': _tmpCmd.name //zero
                    });
                    break;

                case ("stop"):
                    return ({
                        'type': 'key_press',
                        'dialSetting': dialSetting,
                        'cmd': _tmpCmd.name //zero
                    });
                    break;


                case ("arrow1"):
                    return ({
                        'type': 'key_press',
                        'dialSetting': dialSetting,
                        'cmd': _tmpCmd.name //zero
                    });
                    break;

                case ("macro_1"):
                    return ({
                        'type': 'key_press',
                        'dialSetting': dialSetting,
                        'cmd': _tmpCmd.name //zero
                    });
                    break;

                case ("macro_1"):
                    return ({
                        'type': 'key_press',
                        'dialSetting': dialSetting,
                        'cmd': _tmpCmd.name //zero
                    });
                    break;
                case ("macro_2"):
                    return ({
                        'type': 'key_press',
                        'dialSetting': dialSetting,
                        'cmd': _tmpCmd.name //zero
                    });
                    break;

                case ("macro_3"):
                    return ({
                        'type': 'key_press',
                        'dialSetting': dialSetting,
                        'cmd': _tmpCmd.name //zero
                    });
                    break;
                case ("macro_6"):
                    return ({
                        'type': 'key_press',
                        'dialSetting': dialSetting,
                        'cmd': _tmpCmd.name //zero
                    });
                    break;
                case ("macro_7"):
                    return ({
                        'type': 'key_press',
                        'dialSetting': dialSetting,
                        'cmd': _tmpCmd.name //zero
                    });
                    break;

                case ("safez"):
                    return ({
                        'type': 'key_press',
                        'dialSetting': dialSetting,
                        'cmd': _tmpCmd.name //safe_z
                    });
                    break;

                case ("probez"):
                    return ({
                        'type': 'key_press',
                        'dialSetting': dialSetting,
                        'cmd': _tmpCmd.name //safe_z
                    });
                    break;

                case ("arrow2"): //Arrow2 is, at least for now go to zero on all axis
                    return ({
                        'type': 'key_press',
                        'dialSetting': dialSetting,
                        'cmd': _tmpCmd.name //arrow2
                    });
                    break;

                case ("step++"):
                    console.log("Changing Step Rate for Incremental Mode");
                    setStepDistance();
                    console.log("\t " + getStepDistance());
                    return ({
                        'type': 'change',
                        'dialSetting': dialSetting,
                        'value': getStepDistance() //incremental value
                    });
                    break;

                case ("model"):
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
            console.log("DIAL: " + dialSetting + " Command Code Unknown: " + data.toString('hex'));

        }
    }
};

var getStepDistance = function () {
    return distanceTable[stepDistance];
};

var setStepDistance = function () {

    //We only have 3 values in the array for distanceTable
    //So if its 3 lets reset it back to 0
    if (stepDistance == 3) {
        stepDistance = 0;
    } else {
        stepDistance = stepDistance + 1;
    }
};

Xpen.prototype.setUnits = function (units) {
    var self = this;
    if (units == self.MM) {
        self.units = self.MM;
    } else {
        self.units = self.INCHES;
    }
    console.info("Changing Units to: " + this.units);

};

Xpen.prototype.test = function (b) {
    isPaused = b; //true or false
};


module.exports = Xpen;