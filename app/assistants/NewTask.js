/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo
*/

function NewTaskAssistant() {
    Mojo.Log.info("NewTask()");
}

NewTaskAssistant.prototype.setup = function() {
    Mojo.Log.info("NewTask::setup()");

    this.titleAttributes = {autoFocus: true, multiline: false, textCase: Mojo.Widget.steModeLowerCase};
    this.titleModel = {};
    this.controller.setupWidget("title", this.titleAttributes, this.titleModel); 

    this.descriptionAttributes = {autoFocus: false, multiline: true, textCase: Mojo.Widget.steModeLowerCase};
    this.descriptionModel = {};
    this.controller.setupWidget("description", this.descriptionAttributes, this.descriptionModel); 

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
    Mojo.Controller.stageController.popScene();
};
