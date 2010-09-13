
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
    var t = this.task;

    this.menuSetup();

    this.s = new SuccessDialog("NewTask", this.controller);
    this.S = this.s.showSuccess;

    this.controller.get("id").update(t.record_locator);

    this.boringAttributes = {autoFocus: false, multiline: false, textCase: Mojo.Widget.steModeLowerCase};
    this.controller.setupWidget("title", this.boringAttributes, this.titleModel = {value: t.summary});

    this.descriptionAttributes = {autoFocus: false, multiline: true, textCase: Mojo.Widget.steModeLowerCase};
    this.controller.setupWidget("description", this.descriptionAttributes, this.descriptionModel = {value: t.description});

    this.commentAttributes = {autoFocus: true, multiline: true, textCase: Mojo.Widget.steModeLowerCase};
    this.controller.setupWidget("comment", this.commentAttributes, this.commentModel = {});

    this.controller.setupWidget("go", {}, this.goModel = {buttonClass: 'affirmative', label: "Update"});
    this.controller.setupWidget("no", {}, this.noModel = {buttonClass: 'negative',  label: "Cancel"});

    var checkBoxAttributes = { trueValue: '1', falseValue: '0' };
    this.controller.setupWidget('stacks-up',      checkBoxAttributes, this.stacksUpModel      = {value: t.repeat_stacking});
    this.controller.setupWidget('hidden-forever', checkBoxAttributes, this.hiddenForeverModel = {value: t.starts !== null ? "1":"0"});
    this.controller.setupWidget('complete',       checkBoxAttributes, this.completeModel      = {value: t.complete});
    this.controller.setupWidget('accept',         checkBoxAttributes, this.acceptModel        = {value: t.accepted});

    if( this.task.accepted )
        this.controller.get("accept-row").addClassName("generically-hidden");
}

Mojo.Log.info('loaded(EditTask.js)');
