
/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo AMO ErrorDialog SuccessDialog TMO
*/

function EditTaskAssistant(_i) {
    Mojo.Log.info("EditTask(%s)", (this.task = _i).record_locator);

    this.SCa = Mojo.Controller.stageController.assistant;

    this.menuSetup = this.SCa.menuSetup.bind(this);

    this.e = new ErrorDialog("EditTask");
    this.E = this.e.showError;
}

EditTaskAssistant.prototype.setup = function() {
    Mojo.Log.info("EditTask::setup()");
    var t = this.task;

    this.menuSetup();

    this.s = new SuccessDialog("EditTask", this.controller);
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

    this.controller.setupWidget("group", {label: "group"}, this.groupModel={choices:[], value:t.group ? t.group : ''});

    this.controller.setupWidget("tags", this.boringAttributes, this.tagsModel = {value: t.summary});
    this.controller.setupWidget("owner", this.boringAttributes, this.ownerModel = {value:t.owner});

    var prios = [
        {label: "Highest", value: "5", iconPath: 'img/highest.png' },
        {label: "High",    value: "4", iconPath: 'img/high.png'    },
        {label: "Normal",  value: "3", iconPath: 'img/normal.png'  },
        {label: "Low",     value: "2", iconPath: 'img/low.png'     },
        {label: "Lowest",  value: "1", iconPath: 'img/lowest.png'  }
    ];

    this.controller.setupWidget("priority", {label: "priority", choices: prios}, this.priorityModel={value:t.priority});

    this.controller.setupWidget("due-date",   this.boringAttributes, this.dueDateModel   = {value: t.due});
    this.controller.setupWidget("hide-until", this.boringAttributes, this.hideUntilModel = {value: t.starts});

    this.numberAttributes = {multiline: false, textCase: Mojo.Widget.steModeLowerCase, modifierState: Mojo.Widget.numLock };
    this.controller.setupWidget("every",      this.numberAttributes, this.everyModel     = {value: t.repeat_every});
    this.controller.setupWidget("heads-up",   this.numberAttributes, this.headsUpModel   = {value: t.repeat_days_before_due});

    var schedules = [
        {label: "Once",     value: "once"   },
        {label: "Daily",    value: "days"   },
        {label: "Weekly",   value: "weeks"  },
        {label: "Monthly",  value: "months" },
        {label: "Annually", value: "years"  }
    ];
    var sch = function() {
        var v = this.scheduleModel.value;
        if(v === 'once') this.controller.get("schedule-img").   addClassName("generically-hidden");
        else             this.controller.get("schedule-img").removeClassName("generically-hidden");

    }.bind(this);
    this.controller.setupWidget("schedule", {label: "schedule", choices: schedules}, this.scheduleModel={value:t.repeat_period});
    Mojo.Event.listen(this.controller.get("schedule"), Mojo.Event.propertyChange, sch);
    sch();

    this.controller.setupWidget("time-worked", this.boringAttributes, this.timeWorkedModel = {value: t.time_worked});
    this.controller.setupWidget("time-left",   this.boringAttributes, this.timeLeftModel   = {value: t.time_left});

    if( AMO.isCurrentAccountPro() )
        this.controller.get("pro-time").removeClassName("generically-hidden");
};

EditTaskAssistant.prototype.activate = function() {
    Mojo.Log.info("EditTask::activate()");

    AMO.registerSrchgChange(this.handleGroupListChange);
};

EditTaskAssistant.prototype.deactivate = function() {
    Mojo.Log.info("EditTask::deactivate()");

    AMO.unregisterSrchgChange(this.handleGroupListChange);
};

EditTaskAssistant.prototype.handleGroupListChange = function(groups) {
    Mojo.Log.info("EditTask::handleGroupListChange()");

    var l = [{label: 'Personal', value: ''}];

    try {
        // if( false )
        for(var i=0; i<groups.length; i++)
            l.push({label: groups[i].name, value: groups[i].id});

    } catch (e) { /* this just means groups was undefined, yawn */ }

    this.groupModel.choices = l;
    this.controller.modelChanged(this.groupModel);

    if( this.groupModel.choices.length >= 2 )
         this.controller.get("group-row").removeClassName("generically-hidden");
    else this.controller.get("group-row").addClassName("generically-hidden");
};

Mojo.Log.info('loaded(EditTask.js)');
