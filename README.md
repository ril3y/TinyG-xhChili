# TinyG-xhChili
A NodeJS User Land driver for the Xhc CNC Pendant for Chilipeppr and SPJS


##Installation:
This code assumes you have NodeJS installed and npm is in your path.
npm install

This should get everything you need.


##Usage:
Just call the xpen.js with the --spjsServer and a valid ip like below:

nodejs --spjsServer 192.168.1.106 

##Notes:
The websocket port 8989 is hard coded.  This is also a work in progress. On linux it looks like python is needed to build the needed node libs also.
