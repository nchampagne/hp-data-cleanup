const Argv                  = require('minimist')
const CodeCleanup           = require("./modules/code-updates/code-updates.js");
const HighmarkHPCDupes      = require("./modules/highmark-healthplanclaim-dupes/highmark-healthplanclaim-dupes.js");
const DemographicsCatchup   = require("./modules/data-catchup/data-catchup.js");

/*
 *  -m localhost:27017
 *  -c <command>
 */
let args = Argv(process.argv.slice(2));

validateArgs(args);
evalCommands(args);

function validateArgs(args) {
    if(!args) {
        console.log("No arguments provided");
        process.exit(9);
    }
    return (args) => executeCommand(args);
}

function evalCommands(args) {
    if(Array.isArray(args.c)) {
        args.c.forEach((c) => {
            console.log(c);
            executeCommand(c);
        });
    }
    else {
        executeCommand(args.c)
    }
}

function executeCommand(command) {
    switch(command) {
        case "code-cleanup":
            CodeCleanup.execute("mongodb://" + args.m);
            break;
        case "highmark-source-name-dupes":
            HighmarkHPCDupes.execute("mongodb://" + args.m);
            break;
        case "data-catchup":
            DemographicsCatchup.execute("mongodb://" + args.s, "mongodb://" + args.d);
            break;
        default:
            if(command) console.log("Unrecognized command " + command);
            else console.log("No commands found");
    }
}
