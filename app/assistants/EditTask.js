
/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo AMO ErrorDialog SuccessDialog TMO qsplit revqsplit
*/

function EditTaskAssistant(_i) {
    Mojo.Log.info("EditTask(%s)", (this.task = _i).record_locator);

    this.SCa = Mojo.Controller.stageController.assistant;

    this.menuSetup             = this.SCa.menuSetup.bind(this);
    this.handleGroupListChange = this.handleGroupListChange.bind(this);
    this.go                    = this.go.bind(this);
    this.no                    = this.no.bind(this);

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
    this.controller.setupWidget("comment", this.commentAttributes, this.commentModel = {value:""});

    this.controller.setupWidget("go", {}, this.goModel = {buttonClass: 'affirmative', label: "Update"});
    this.controller.setupWidget("no", {}, this.noModel = {buttonClass: 'negative',  label: "Cancel"});

    Mojo.Event.listen(this.controller.get("go"), Mojo.Event.tap, this.go);
    Mojo.Event.listen(this.controller.get("no"), Mojo.Event.tap, this.no);

    var checkBoxAttributes = { trueValue: '1', falseValue: '0' };
    this.controller.setupWidget('stacks-up',      checkBoxAttributes, this.stacksUpModel      = {value: t.repeat_stacking});
    this.controller.setupWidget('hidden-forever', checkBoxAttributes, this.hiddenForeverModel = {value: t.will_complete=="0"?"1":"0"});
    this.controller.setupWidget('complete',       checkBoxAttributes, this.completeModel      = {value: t.complete});
    this.controller.setupWidget('accept',         checkBoxAttributes, this.acceptModel        = {value: t.accepted});

    if( this.task.accepted )
        this.controller.get("accept-row").addClassName("generically-hidden");

    this.controller.setupWidget("group", {label: "group"}, this.groupModel={choices:[], value:t.group ? t.group : ''});

    this.controller.setupWidget("tags",  this.boringAttributes, this.tagsModel  = {value: revqsplit(qsplit(t.tags))});
    this.controller.setupWidget("owner", this.boringAttributes, this.ownerModel = {value: t.owner});

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

    for(var key in this)
        if( key.match(/Model$/) )
            this[key]._oVal = this[key].value;
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

EditTaskAssistant.prototype.no = function() {
    Mojo.Log.info("EditTask::no()");
    Mojo.Controller.stageController.popScene();
};

EditTaskAssistant.prototype.go = function() {
    Mojo.Log.info("EditTask::go()");

    // perl -ne 'print "    // $1\n" if m/(this[a-zA-Z.]+Model)/ and not $u{$1}++' app/assistants/EditTask.js
    // - won't impliment; t - tested; x - added;

    // [x] this.titleModel
    // [x] this.descriptionModel
    // [x] this.tagsModel
    // [x] this.groupModel
    // [x] this.ownerModel
    // [x] this.priorityModel
    // [x] this.dueDateModel
    // [x] this.hideUntilModel

    // [x] this.scheduleModel
    // [x] this.stacksUpModel
    // [x] this.everyModel
    // [x] this.headsUpModel

    // [x] this.timeWorkedModel
    // [x] this.timeLeftModel

    // [x] this.commentModel
    // [x] this.completeModel
    // [x] this.hiddenForeverModel

    var params = {id: this.task.id};
    var mandatories = [ "will_complete" ];
    for(var _m in mandatories)
        params[mandatories[_m]] = this.task[mandatories[_m]];
        // NOTE: there are other "manditory" fields, but only this one seems to
        // actually be manditory -- manditory in the sense that  if it's
        // absent, HM thinks it's supposed to change it to false

    var did_stuff = false;
    var v; var f = function(x) {
        if( (v=this[x].value) === this[x]._oVal) return false;
        did_stuff = true;
        return true;
    }.bind(this);

    if( !this.titleModel.value ) {
        this.E("EditTask::go()", "post error", "Please provide a title for the task");
        return;
    }

    if( f("titleModel") ) params.summary = v;

    if( f("descriptionModel"  ) ) params.description            = v;
    if( f("ownerModel"        ) ) params.owner_id               = v;
    if( f("groupModel"        ) ) params.group_id               = v;
    if( f("priorityModel"     ) ) params.priority               = v;
    if( f("dueDateModel"      ) ) params.due                    = v;
    if( f("hideUntilModel"    ) ) params.starts                 = v;
    if( f("scheduleModel"     ) ) params.repeat_period          = v;
    if( f("stacksUpModel"     ) ) params.repeat_stacking        = v;
    if( f("headsUpModel"      ) ) params.repeat_days_before_due = v;
    if( f("everyModel"        ) ) params.repeat_every           = v;
    if( f("timeWorkedModel"   ) ) params.time_worked            = v;
    if( f("timeLeftModel"     ) ) params.time_left              = v;
    if( f("commentModel"      ) ) params.comment                = v;
    if( f("completeModel"     ) ) params.complete               = v;
    if( f("hiddenForeverModel") ) params.will_complete          = v=="1"?"0":"1";

    if( f("tagsModel") ) {
        var q = qsplit(v);
        if( q ) params.tags = q.join(" ");
        else {
            this.E("EditTask::go()", "post error", "tag list must be space separated tokens with balanced quotes");
            return;
        }
    }

    Mojo.Log.info("EditTask::go() params: %s", Object.toJSON(params));

    if( !did_stuff )
        this.E("EditTask::go()", "post error", "nothing changed, update not posted");

    else TMO.updateTask(params,this.task);
};

Mojo.Log.info('loaded(EditTask.js)');
