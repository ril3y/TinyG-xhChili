var NodeChilipeppr = require("./../node-chilipeppr.js");
var XHC = require("./../node-xhc.js");
var Timer = require('clockmaker').Timer;


var Pendant = function () {
    var self = this;


    //This is the amount of time that the increment will continue to "move"
    //until sending a stop.  This is useful if you cranked on the dial to move a bunch in
    //incremental mode when you thought you were in cont. mode.
    //Basically, the pendant driver will wait for x milliseconds since the last time a
    //Dial click was received before just sending a flushStop.
    self.incrementTimeoutValue = 2000;
    //this.dialSetting = "X";

    //====================================
    //TinyG Specifics
    //====================================
    self.probeZ = "G38.2 Z-20 F25\n";




    self.ncp = new NodeChilipeppr();
    self.xhc = new XHC();
    //self.ncp.connect("192.168.1.106", 8989);
    //self.ncp.connect("192.168.1.107", 8989);
    self.ncp.connect("127.0.0.1", 8989);

    self.init();
};

Pendant.prototype.zeroAxis = function(axis){
    return("G28.3" + axis + "0\n");
};

Pendant.prototype.init = function () {
    var self = this;




    self.xhc.on("change", function (data) {
        //console.log("CHANGE FIRED: ", data);
        switch (data.cmd) {
            case("step_distance"):
                self.stepDistance = data.value;
                break;
            case("dial_indicator"):
                console.log("Dial Indicator: ->" + data.value);
                self.dialSetting = data.value;
                break;
            case("macro1_set"):
                //TODO: Finish Macro Code.
                break;
            case("macro2_set"):
                //TODO: Finish Macro Code.
                break;
            case("macro3_set"):
                //TODO: Finish Macro Code.
                break;
            case("macro6_set"):
                //TODO: Finish Macro Code.
                break;
            case("macro7_set"):
                //TODO: Finish Macro Code.
                break;
        }
    });


    self.xhc.on("key_press", function (data) {

        console.log("BYTES: ", JSON.stringify(data));
        switch (data.cmd) {
            case("feedhold"):
                self.ncp.send("!\n");
                break;
            case("resume"):
                self.ncp.send("~\n");
                break;
            case("zero"):
                console.log("Zeroing: " + self.dialSetting);
                if(self.dialSetting == "X" || self.dialSetting == "Y" || self.dialSetting == "Z" || self.dialSetting =="A"){
                    self.ncp.send(self.zeroAxis(self.dialSetting));
                }else{
                    console.log("Dial not X Y Z or A.. Ignoring Zero Command");
                }


                break;
            case("probez"):
                self.ncp.send(this.probeZ);
                break;
            case("safez"):
                if (!self.safeZ) {
                    //safez is not set.
                    console.log("Error: Safe Z not set... Ignoring command.")
                } else {
                    self.ncp.send(this.safeZ);
                }
                break;
            case("rewind"):
                console.log("Rewind Issued: ");
                break;
            case("zero"):
                break;
            case("zero"):
                break;
            case("zero"):
                break;
            case("zero"):
                break;

        }
    });

    self.xhc.on("jog", function (data) {
        switch (data.cmd) {
            case("jog_continuous_finish"):
                //Finish Jog sent stop
                self.ncp.send("g90\n");
                //Once we stop twisting the dial in cont mode we send a stopFlush
                self.sendStopFlush();
                break;
            case("jog_incremental_finish"):
                self.ncp.send("g90\n");
                self.toggleTimer("start");
                break;

            case("jog_incremental"):
                //
                _msg = "g1f50" + data.dialSetting + data.dir + self.xhc.getStepDistance() + "\n";
                self.ncp.send("g91\n");
                self.ncp.send(_msg);
                self.toggleTimer("stop");
                break;
            case("jog_continuous"):
                //
                console.log("Cont Mode Jog: ", data);
                _msg = "g1f" + data.value + data.dialSetting + data.dir + "1\n";
                self.ncp.send("g91\n");
                self.ncp.send(_msg);
                break;
        }

    });

}

Pendant.prototype.sendStopFlush = function () {
    self = this;
    self.ncp.send("!\n%\n");
};

Pendant.prototype.processXhcCommands = function () {

};

Pendant.prototype.toggleTimer = function (state) {
    var self = this;
    if (!self.timer) {
        self.timer = new Timer(function (timer) {
            console.log("Incremental Mode TIMEOUT occured");
            self.sendStopFlush();
        }, self.incrementTimeoutValue, {repeat: false});
    }

    if (state == "start") {
        //What is all this?
        //So when the timer fires we create a new timer if needed.

        if (self.timer.isStopped()) {
            self.timer = new Timer(function (timer) {
                console.log("Incremental Mode TIMEOUT occured");
                self.sendStopFlush();
            }, self.incrementTimeoutValue, {repeat: false});
            self.timer.start();
        } else {
            self.timer.start();
        }
    } else {
        //This will reset the timer to current time.now();
        self.timer.synchronize();
    }

};

var pendant = new Pendant();


//var incrementTimer = setTimeout(function(){
//    console.log("TIMER FIRED STOPPING JOG MOTION");
//    sendStopFlush();
//}, 2000);


//var timer = new Timer(function(timer) {
//    console.log(timer.getDelay() + ' millseconds, ' + timer.getNumTicks() + ' ticks.');
//}, 2000, { repeat: false });
//

//
//
//
//function toggletimer(state){
//
//    if(!timer){
//        var timer = new Timer(function(timer) {
//            console.log(timer.getDelay() + ' millseconds, ' + timer.getNumTicks() + ' ticks.');
//        }, 2000, { repeat: false });
//    }
//
//    if(state == "start"){
//        timer.start();
//    }else{
//        timer.stop();
//    }
//}
//
//var toggleTimer = toggletimer();
//
//
////var startTimer = function(){
////    if(!timer){
////        var timer = new Timer(function(timer) {
////            console.log(timer.getDelay() + ' millseconds, ' + timer.getNumTicks() + ' ticks.');
////        }, 2000, { repeat: false });
////    }
////    // incrementTimer = setTimeout(function(){
////    //    console.log("TIMER FIRED STOPPING JOG MOTION");
////    //    sendStopFlush();
////    //}, 2000;
////
////    timer.start();
////};
////
////var stopTimer = function(){
////    timer.stop();
////    //clear this increment timer out
////    //clearTimeout(incrementTimer);
////};
//
//
//
//
//
//
//ncp.on("control", function(data){
//    if(data.hasOwnProperty("feed_hold")){
//        console.log("Feed Hold is: "+ data.feed_hold);
//    }
//})
//
//
//xhc.on("key_press",function(data){
//    console.info("KEY_PRESS: " + JSON.stringify(data));
//    //xhc.test(true);
//});
//
//var sendStopFlush = function () {
//    ncp.send("!\n%\n");
//};
//
//
//
//
//
//
//xhc.on("jog", function(data){
//    switch(data.cmd) {
//        case("jog_continuous_finish"):
//            //Finish Jog sent stop
//            ncp.send("g90\n");
//            //Once we stop twisting the dial in cont mode we send a stopFlush
//            sendStopFlush();
//            break;
//        case("jog_incremental_finish"):
//            ncp.send("g90\n");
//            toggleTimer("start");
//
//        case("jog_incremental"):
//            //
//            _msg = "g1f50"+data.dialSetting+data.dir +"1\n";
//            ncp.send("g91\n");
//            ncp.send(_msg);
//            //stopTimer();
//            break;
//        case("jog_continuous"):
//            //
//            console.log("Cont Mode Jog: ", data);
//            _msg = "g1f"+data.value+data.dialSetting+data.dir +"1\n";
//            ncp.send("g91\n");
//            ncp.send(_msg);
//            break;
//    }
//
//
//    console.info("JOGGING: " + JSON.stringify(data));
//    //_msg = "g1f50"+data.dialSetting+"1\n";
//    console.log("MSG: " + _msg);
//    //ncp.send()
//});
//
//xhc.on("change", function(data){
//    console.info("CHANGE: " + JSON.stringify(data));
//});
//
//
//
//ncp.on("error", function(err){
// console.log("ERROR: ", err);
//});
//
//ncp.on('data', function(data){
//
//});
//
//ncp.on("debug",function(data){
//    console.log("DEBUG: ==> ", data);
//});
//
//ncp.on("connection",function(data){
//    var self = this;
//    switch(data.type) {
//        case("connected"):
//            console.log("PORT CONNECTED: ", data);
//            //ncp.send("send "+ this.connectedPort+ " g1f2x100\n");
//            break;
//        case("disconnected"):
//            console.log("PORT DISCONNECTED: ", data);
//            break;
//    }
//});
//
