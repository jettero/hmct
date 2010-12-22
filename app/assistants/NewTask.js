/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo AMO ErrorDialog SuccessDialog TMO qsplit RegExp
*/

function NewTaskAssistant() {
    Mojo.Log.info("NewTask()");

    this.SCa = Mojo.Controller.stageController.assistant;

    this.menuSetup             = this.SCa.menuSetup.bind(this);
    this.handleGroupListChange = this.handleGroupListChange.bind(this);

    this.e = new ErrorDialog("NewTask");
    this.E = this.e.showError;

    this.s = new SuccessDialog("NewTask");
    this.S = this.s.showSuccess;
}

NewTaskAssistant.prototype.setup = function() {
    Mojo.Log.info("NewTask::setup()");

    this.menuSetup();

    this.sendModel        = { label: "Send", icon: 'send', command: 'go' };
    this.commandMenuModel = { label: 'NewTask Command Menu', items: [ {}, this.sendModel ] };
	this.controller.setupWidget(Mojo.Menu.commandMenu, {menuClass: 'no-fade'}, this.commandMenuModel);

    this.titleAttributes = {autoFocus: true, multiline: false, textCase: Mojo.Widget.steModeLowerCase};
    this.controller.setupWidget("title", this.titleAttributes, this.titleModel = {});

    this.descriptionAttributes = {autoFocus: false, multiline: true /*, textCase: Mojo.Widget.steModeLowerCase*/ };
    this.controller.setupWidget("description", this.descriptionAttributes, this.descriptionModel = {});

    this.boringAttributes  = {multiline: false, textCase: Mojo.Widget.steModeLowerCase};
    this.preSelBAttributes = {autoFocus: false, multiline: false, textCase: Mojo.Widget.steModeLowerCase, focusMode: Mojo.Widget.focusSelectMode };
    this.numberAttributes  = {multiline: false, textCase: Mojo.Widget.steModeLowerCase, modifierState: Mojo.Widget.numLock };
    this.preSelNAttributes = {autoFocus: false, multiline: false, textCase: Mojo.Widget.steModeLowerCase, modifierState: Mojo.Widget.numLock, focusMode: Mojo.Widget.focusSelectMode };

    var _tags = TMO.knownTags();
    if( _tags.length ) {
        var tpf = this.controller.get("tag-pre-filler");
            tpf.removeClassName("generically-hidden");

        var items = [];
        _tags.each(function(i){ items.push({label: i, command: i}); });

        Mojo.Event.listen(tpf, Mojo.Event.tap, function(){
            this.controller.popupSubmenu({
                onChoose: function(v) {
                    if( v == undefined ) return; // STFU: I mean ==

                    var re = new RegExp("\\b" + v + "\\b");
                    if( this.tagsModel.value && this.tagsModel.value.length ) {
                        if( !this.tagsModel.value.match(re) ) {
                            this.tagsModel.value += " " + v;
                            this.controller.modelChanged(this.tagsModel);
                        }

                    } else {
                        this.tagsModel.value = v;
                        this.controller.modelChanged(this.tagsModel);
                    }

                }.bind(this),
                placeNear: tpf,
                items:     items
            });
        }.bind(this));
    }

    this.controller.setupWidget("tags",       this.boringAttributes,  this.tagsModel      = {});
    this.controller.setupWidget("owner",      this.preSelBAttributes, this.ownerModel     = {});
    this.controller.setupWidget("due-date",   this.preSelBAttributes, this.dueDateModel   = {});
    this.controller.setupWidget("hide-until", this.preSelBAttributes, this.hideUntilModel = {});
    this.controller.setupWidget("every",      this.preSelNAttributes, this.everyModel     = {});
    this.controller.setupWidget("heads-up",   this.preSelNAttributes, this.headsUpModel   = {});

    Mojo.Event.listen(this.controller.get('due-date-dp'), Mojo.Event.tap, function(){
        this.controller.showDialog({
            template: 'DatePickerDialog',
            assistant: new DatePickerDialogAssistant(this, this.dueDateModel)
        });
    }.bind(this));

    Mojo.Event.listen(this.controller.get('hide-until-dp'), Mojo.Event.tap, function(){
        this.controller.showDialog({
            template: 'DatePickerDialog',
            assistant: new DatePickerDialogAssistant(this, this.hideUntilModel)
        });
    }.bind(this));

    this.controller.setupWidget("but-first", this.boringAttributes, this.butFirstModel = {value: ""});
    this.controller.setupWidget("and-then",  this.boringAttributes, this.andThenModel  = {value: ""});

    this.controller.setupWidget("time-worked", this.preSelBAttributes, this.timeWorkedModel = {});
    this.controller.setupWidget("time-left",   this.preSelBAttributes, this.timeLeftModel   = {});

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
        if(v === 'once') {
            this.controller.get("schedule-img").addClassName("generically-hidden");
            this.controller.get("recurrence-sub-opt").addClassName("generically-hidden");
            this.controller.get("recurrence-pri-opt-row").addClassName('single');
            this.controller.get("recurrence-pri-opt-row").removeClassName('first');

        } else {
            this.controller.get("schedule-img").removeClassName("generically-hidden");
            this.controller.get("recurrence-sub-opt").removeClassName("generically-hidden");
            this.controller.get("recurrence-pri-opt-row").removeClassName('single');
            this.controller.get("recurrence-pri-opt-row").addClassName('first');
        }

    }.bind(this));

    var checkBoxAttributes = { trueValue: '1', falseValue: '0' };
    this.controller.setupWidget('stacks-up', checkBoxAttributes, this.stacksUpModel = {value: "0"});

    this.handleGroupListChange([]); // kick it off
};

NewTaskAssistant.prototype.go = function() {
    Mojo.Log.info("NewTask::go()");

    var params = {};
    var v; var f = function(x) { if(typeof x === "string" && x.length>0) return true; return false; };

    if( !this.titleModel.value ) {
        this.E("NewTask::go()", "post error", "Please provide a title for the task");
        return;
    }

    params.summary = this.titleModel.value;

    if( f(v = this.descriptionModel.value) ) params.description            = v;
    if( f(v = this.ownerModel      .value) ) params.owner_id               = v;
    if( f(v = this.groupModel      .value) ) params.group_id               = v;
    if( f(v = this.priorityModel   .value) ) params.priority               = v;
    if( f(v = this.dueDateModel    .value) ) params.due                    = v;
    if( f(v = this.hideUntilModel  .value) ) params.starts                 = v;
    if( f(v = this.scheduleModel   .value) ) params.repeat_period          = v;
    if( f(v = this.stacksUpModel   .value) ) params.repeat_stacking        = v;
    if( f(v = this.headsUpModel    .value) ) params.repeat_days_before_due = v; // heh, really?
    if( f(v = this.everyModel      .value) ) params.repeat_every           = v;
    if( f(v = this.timeWorkedModel .value) ) params.time_worked            = v;
    if( f(v = this.timeLeftModel   .value) ) params.time_left              = v;

    var bf_compr = TMO.compareTextFieldDeps("", this.butFirstModel.value);
    var at_compr = TMO.compareTextFieldDeps("",  this.andThenModel.value);

    if( bf_compr.toAdd.length === 1 )
        params.depends_on = bf_compr.toAdd.shift;

    if( at_compr.toAdd.length === 1 )
        params.depends_on_by = at_compr.toAdd.shift;

    if( f(v = this.tagsModel.value) ) {
        var q = qsplit(v);
        if( q ) params.tags = q.join(" ");
        else {
            this.E("NewTask::go()", "post error", "tag list must be space separated tokens with balanced quotes");
            return;
        }
    }

    Mojo.Log.info("NewTask::go() params: %s", Object.toJSON(params));

    Mojo.Controller.stageController.popScene();

    TMO.postNewTask(params, function(r){ TMO.searchTasks(); });
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

    this.slurpLastSearch();
};

NewTaskAssistant.prototype.deactivate = function() {
    Mojo.Log.info("NewTask::deactivate()");

    AMO.unregisterSrchgChange(this.handleGroupListChange);
};

NewTaskAssistant.prototype.slurpLastSearch = function() {
    Mojo.Log.info("NewTask::slurpLastSearch()");

    var query = TMO.getLastSearchKeyed();
    var me = this;
    Mojo.Log.info("NewTask::slurpLastSearch() keys: %s", Object.toJSON(query));

    var append_txt = function(x,y,u) {
        if( ! (y in query) )
            return;

        if( u && query[y].match(u) ) // unless
            return;

        try {
            me[x + "Model"].value = query[y];
            me.controller.modelChanged(me[x + "Model"]);
        }

        catch(e) {
            Mojo.Log.error("problem setting " + x + "-txt from last-search keys: " + e);
        }
    };

    var append_bin = function(x,y) {
        if( ! (y in query) )
            return;

        try {
            me[x + "Model"].value = query[y] ? "on" : "off";
            me.controller.modelChanged(me[x + "Model"]);
        }

        catch(e) {
            Mojo.Log.error("problem setting " + x + "-txt from last-search keys: " + e);
        }
    };

    append_txt("group",  "group");
    append_txt("tags",   "tag");
    append_txt("owner",  "owner");

    // these have questionable value imo...  group, tag and owner are the main
    // ones they definitely do this though
    append_txt("priority",  "priority/above");
    append_txt("priority",  "priority/below");
    append_txt("dueDate",   "due/after");
    append_txt("dueDate",   "due/before");
    append_txt("hideUntil", "hide/until/after");
    append_txt("hideUntil", "hide/until/before");

    append_txt("butFirst",  "but/first", /nothing/);
    append_txt("andThen",   "and/then",  /nothing/);
};

NewTaskAssistant.prototype.handleCommand = function(event) {
    Mojo.Log.info("NewTask::handleCommand()");

    if (event.type === Mojo.Event.command) {
        var s_a = event.command.split(/\s*(?:@@)\s*/);

        switch (s_a[0]) {
            case 'go':
                Mojo.Log.info("NewTask::handleCommand(go)");
                this.go();
                break;

            default:
                Mojo.Log.info("NewTask::handleCommand(unknown command: %s)", Object.toJSON(s_a));
                break;
        }
    }

};

Mojo.Log.info('loaded(NewTask.js)');
