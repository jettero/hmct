
/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo AMO ErrorDialog SuccessDialog TMO
*/

function EditTaskAssistant(_i) {
    Mojo.Log.info("EditTask(%s)", (this.task = _i).record_locator);

    this.SCa = Mojo.Controller.stageController.assistant;

    this.menuSetup = this.SCa.menuSetup.bind(this);

    this.e = new ErrorDialog("NewTask");
    this.E = this.e.showError;
}

EditTaskAssistant.prototype.setup = function() {
    Mojo.Log.info("NewTask::setup()");

    this.menuSetup();

    this.s = new SuccessDialog("NewTask", this.controller);
    this.S = this.s.showSuccess;

    this.controller.get("id").update(this.task.record_locator);

    this.boringAttributes = {autoFocus: false, multiline: false, textCase: Mojo.Widget.steModeLowerCase};
    this.controller.setupWidget("title", this.boringAttributes, this.titleModel = {value: this.task.summary});

    this.descriptionAttributes = {autoFocus: false, multiline: true, textCase: Mojo.Widget.steModeLowerCase};
    this.controller.setupWidget("description", this.descriptionAttributes, this.descriptionModel = {value: this.task.description});

    this.commentAttributes = {autoFocus: true, multiline: true, textCase: Mojo.Widget.steModeLowerCase};
    this.controller.setupWidget("comment", this.commentAttributes, this.commentModel = {});
}

Mojo.Log.info('loaded(EditTask.js)');
