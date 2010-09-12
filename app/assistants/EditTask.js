
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
}

Mojo.Log.info('loaded(EditTask.js)');
