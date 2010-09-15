/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo AMO ErrorDialog SuccessDialog TMO qsplit
*/

function NewTaskAssistant() {
    Mojo.Log.info("NewTask()");

    this.SCa = Mojo.Controller.stageController.assistant;

    this.menuSetup             = this.SCa.menuSetup.bind(this);
    this.handleGroupListChange = this.handleGroupListChange.bind(this);
    this.go                    = this.go.bind(this);
    this.no                    = this.no.bind(this);

    this.e = new ErrorDialog("NewTask");
    this.E = this.e.showError;
}

NewTaskAssistant.prototype.setup = function() {
    Mojo.Log.info("NewTask::setup()");

    this.menuSetup();

    this.s = new SuccessDialog("NewTask", this.controller);
    this.S = this.s.showSuccess;

    this.titleAttributes = {autoFocus: true, multiline: false, textCase: Mojo.Widget.steModeLowerCase};
    this.controller.setupWidget("title", this.titleAttributes, this.titleModel = {});

    this.descriptionAttributes = {autoFocus: false, multiline: true, textCase: Mojo.Widget.steModeLowerCase};
    this.controller.setupWidget("description", this.descriptionAttributes, this.descriptionModel = {});

    this.controller.setupWidget("go", {}, this.goModel = {buttonClass: 'affirmative', label: "Submit"});
    this.controller.setupWidget("no", {}, this.noModel = {buttonClass: 'negative',  label: "Cancel"});

    Mojo.Event.listen(this.controller.get("go"), Mojo.Event.tap, this.go);
    Mojo.Event.listen(this.controller.get("no"), Mojo.Event.tap, this.no);

    this.boringAttributes = {multiline: false, textCase: Mojo.Widget.steModeLowerCase};
    this.numberAttributes = {multiline: false, textCase: Mojo.Widget.steModeLowerCase, modifierState: Mojo.Widget.numLock };

    this.controller.setupWidget("tags",       this.boringAttributes, this.tagsModel      = {});
    this.controller.setupWidget("owner",      this.boringAttributes, this.ownerModel     = {});
    this.controller.setupWidget("due-date",   this.boringAttributes, this.dueDateModel   = {});
    this.controller.setupWidget("hide-until", this.boringAttributes, this.hideUntilModel = {});
    this.controller.setupWidget("every",      this.numberAttributes, this.everyModel     = {});
    this.controller.setupWidget("heads-up",   this.numberAttributes, this.headsUpModel   = {});

    this.controller.setupWidget("time-worked", this.boringAttributes, this.timeWorkedModel = {});
    this.controller.setupWidget("time-left",   this.boringAttributes, this.timeLeftModel   = {});

    if( AMO.isCurrentAccountPro() )
        this.controller.get("pro-time").removeClassName("generically-hidden");

    this.controller.setupWidget("group", {label: "group"}, this.groupModel={choices:[], value:''});

    var prios = [
        {label: "Highest", value: "5", iconPath: 'img/highest.png' },
        {label: "High",    value: "4", iconPath: 'img/high.png'    },
        {label: "Normal",  value: "3", iconPath: 'img/normal.png'  },
        {label: "Low",     value: "2", iconPath: 'img/low.png'     },
        {label: "Lowest",  value: "1", iconPath: 'img/lowest.png'  }
    ];

    this.controller.setupWidget("priority", {label: "priority", choices: prios}, this.priorityModel={value:"3"});
    Mojo.Event.listen(this.controller.get("priority"), Mojo.Event.propertyChange, function() {
        var v = this.priorityModel.value;
        if(v) {
            for(var i=0; i<prios.length; i++)
                if( prios[i].value === v )
                    this.controller.get("prio-img").src = prios[i].iconPath;
        }

    }.bind(this));

    var schedules = [
        {label: "Once",     value: "once"   },
        {label: "Daily",    value: "days"   },
        {label: "Weekly",   value: "weeks"  },
        {label: "Monthly",  value: "months" },
        {label: "Annually", value: "years"  }
    ];
    this.controller.setupWidget("schedule", {label: "schedule", choices: schedules}, this.scheduleModel={value:"once"});
    Mojo.Event.listen(this.controller.get("schedule"), Mojo.Event.propertyChange, function() {
        var v = this.scheduleModel.value;
        if(v === 'once') this.controller.get("schedule-img").   addClassName("generically-hidden");
        else             this.controller.get("schedule-img").removeClassName("generically-hidden");

    }.bind(this));

    var checkBoxAttributes = { trueValue: '1', falseValue: '0' };
    this.controller.setupWidget('stacks-up', checkBoxAttributes, this.stacksUpModel = {value: "0"});

    this.handleGroupListChange([]); // kick it off
};


NewTaskAssistant.prototype.go = function() {
    Mojo.Log.info("NewTask::go()");

    // perl -ne 'print "    // $1\n" if m/(this[a-zA-Z.]+Model)/ and not $u{$1}++' app/assistants/NewTask.js 
    // - won't impliment; t - tested; x - added;

    // [t] this.titleModel
    // [t] this.descriptionModel
    // [t] this.tagsModel
    // [t] this.groupModel
    // [t] this.ownerModel
    // [t] this.priorityModel
    // [t] this.dueDateModel
    // [t] this.hideUntilModel

    // [t] this.scheduleModel
    // [x] this.stacksUpModel
    // [t] this.everyModel
    // [t] this.headsUpModel

    // [t] this.timeWorkedModel
    // [t] this.timeLeftModel

    // [-] this.hiddenForeverModel
    // [-] this.commentModel

    var params = {};
    var v; var f = function(x) { if(typeof x === "string" && x.length>0) return true; return false; };

    if( !this.titleModel.value ) {
        this.E("NewTask::go()", "post error", "Please provide a title for the task");
        return;
    }

    params.summary = this.titleModel.value;

    if( f(v = this.descriptionModel.value) ) params.description            = v;
    if( f(v = this.ownerModel      .value) ) params.owner_id               = v;
    if( f(v = this.priorityModel   .value) ) params.priority               = v;
    if( f(v = this.dueDateModel    .value) ) params.due                    = v;
    if( f(v = this.hideUntilModel  .value) ) params.starts                 = v;
    if( f(v = this.scheduleModel   .value) ) params.repeat_period          = v;
    if( f(v = this.stacksUpModel   .value) ) params.repeat_stacking        = v;
    if( f(v = this.headsUpModel    .value) ) params.repeat_days_before_due = v; // heh, really?
    if( f(v = this.everyModel      .value) ) params.repeat_every           = v;
    if( f(v = this.timeWorkedModel .value) ) params.time_worked            = v;
    if( f(v = this.timeLeftModel   .value) ) params.time_left              = v;

    if( f(v = this.tagsModel.value) ) {
        var q = qsplit(v);
        if( q ) params.tags = q.join(" ");
        else {
            this.E("NewTask::go()", "post error", "tag list must be space separated tokens with balanced quotes");
            return;
        }
    }

    Mojo.Log.info("NewTask::go() params: %s", Object.toJSON(params));

    TMO.postNewTask(params, function(){

        this.S("NewTask::go()",
            "posted task successfully",
            "New task posted.  Manually refresh any lists where it should be listed.", function(value){
                Mojo.Controller.stageController.popScene();
            });

    }.bind(this));
};

NewTaskAssistant.prototype.no = function() {
    Mojo.Log.info("NewTask::no()");
    Mojo.Controller.stageController.popScene();
};

NewTaskAssistant.prototype.handleGroupListChange = function(groups) {
    Mojo.Log.info("NewTask::handleGroupListChange()");

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

NewTaskAssistant.prototype.activate = function() {
    Mojo.Log.info("NewTask::activate()");

    AMO.registerSrchgChange(this.handleGroupListChange);
};

NewTaskAssistant.prototype.deactivate = function() {
    Mojo.Log.info("NewTask::deactivate()");

    AMO.unregisterSrchgChange(this.handleGroupListChange);
};

Mojo.Log.info('loaded(NewTask.js)');
