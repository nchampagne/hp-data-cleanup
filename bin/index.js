const Argv          = require('minimist')
const CodeCleanup   = require("./modules/code-updates/code-updates.js");

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
        default:
            if(command) console.log("Unrecognized command " + command);
            else console.log("No commands found");
    }
}
