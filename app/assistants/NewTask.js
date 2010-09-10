/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo
*/

function NewTaskAssistant(sceneAssistant) {
    Mojo.Log.info("NewTask()");

    this.sceneAssistant = sceneAssistant;
    this.controller     = sceneAssistant.controller;

}

NewTaskAssistant.prototype.setup = function(widget) {
    Mojo.Log.info("NewTask::setup()");

    this.widget = widget;

    this.braindumpAttributes = {autoFocus: true};
    this.appendAttributes    = {multiline: false, textCase: Mojo.Widget.steModeLowerCase, autoFocus: false};

    this.braindumpModel = {};
    this.appendModel    = {};

    this.controller.setupWidget("braindump", this.braindumpAttributes, this.braindumpModel); 
    this.controller.setupWidget("append",    this.appendAttributes,    this.appendModel); 

    this.controller.setupWidget("go", {}, this.goModel = {buttonClass: 'affirmative', label: "Send"}); 
    this.controller.setupWidget("no", {}, this.noModel = {buttonClass: 'negative',  label: "Cancel"}); 

    Mojo.Event.listen($("go"), Mojo.Event.tap, this.go)
    Mojo.Event.listen($("no"), Mojo.Event.tap, this.no)
};


NewTaskAssistant.prototype.go = function() {
    Mojo.Log.info("NewTask::go()");
};

NewTaskAssistant.prototype.no = function() {
    Mojo.Log.info("NewTask::no()");
};
