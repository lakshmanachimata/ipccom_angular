let Jasmine = require("jasmine");
let _jasmine = new Jasmine();

_jasmine.loadConfigFile("spec/support/jasmine.json");

_jasmine.configureDefaultReporter({
    showColors: true
})

_jasmine.execute();

_jasmine.onComplete(function(passed){
    if(passed){
        console.log("All specs have passed");
    }else{
        console.log("At least one spec has failed");
        process.exit(1);
    }
})