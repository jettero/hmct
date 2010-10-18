
/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo AMO ErrorDialog SuccessDialog TMO qsplit revqsplit id2rl rl2id $A
*/

function EditTaskAssistant(_i) {
    this.task = _i;

    Mojo.Log.info("EditTask(%s)", this.task.record_locator);

    this.SCa = Mojo.Controller.stageController.assistant;

    this.menuSetup             = this.SCa.menuSetup.bind(this);
    this.handleGroupListChange = this.handleGroupListChange.bind(this);

    this.e = new ErrorDialog("EditTask");
    this.E = this.e.showError;

    // this.s = new SuccessDialog("EditTask");
    // this.S = this.s.showSuccess;
}

EditTaskAssistant.prototype.setup = function() {
    Mojo.Log.info("EditTask::setup()");
    var t = this.task;

    this.menuSetup();

    this.sendModel        = { label: "Send", icon: 'send', command: 'go' };
    this.commandMenuModel = { label: 'EditTask Command Menu', items: [ {}, this.sendModel ] };
	this.controller.setupWidget(Mojo.Menu.commandMenu, {menuClass: 'no-fade'}, this.commandMenuModel);

    this.controller.get("id").update(t.record_locator);

    this.boringAttributes  = {multiline: false, textCase: Mojo.Widget.steModeLowerCase};
    this.preSelBAttributes = {autoFocus: false, multiline: false, textCase: Mojo.Widget.steModeLowerCase, focusMode: Mojo.Widget.focusSelectMode };
    this.numberAttributes  = {multiline: false, textCase: Mojo.Widget.steModeLowerCase, modifierState: Mojo.Widget.numLock };
    this.preSelNAttributes = {autoFocus: false, multiline: false, textCase: Mojo.Widget.steModeLowerCase, modifierState: Mojo.Widget.numLock, focusMode: Mojo.Widget.focusSelectMode };

    this.controller.setupWidget("title", this.boringAttributes, this.titleModel = {value: t.summary});

    this.descriptionAttributes = {autoFocus: false, multiline: true /*, textCase: Mojo.Widget.steModeLowerCase*/ };
    this.controller.setupWidget("description", this.descriptionAttributes, this.descriptionModel = {value: t.description});

    this.commentAttributes = {autoFocus: true, multiline: true /*, textCase: Mojo.Widget.steModeLowerCase*/ };
    this.controller.setupWidget("comment", this.commentAttributes, this.commentModel = {value:""});

    var checkBoxAttributes = { trueValue: '1', falseValue: '0' };
    this.controller.setupWidget('stacks-up',      checkBoxAttributes, this.stacksUpModel      = {value: t.repeat_stacking});
    this.controller.setupWidget('hidden-forever', checkBoxAttributes, this.hiddenForeverModel = {value: t.will_complete=="0"?"1":"0"}); // STFU: I mean ==
    this.controller.setupWidget('complete',       checkBoxAttributes, this.completeModel      = {value: t.complete});
    this.controller.setupWidget('accept',         checkBoxAttributes, this.acceptModel        = {value: t.accepted});

    if( this.task.accepted == '1' || !this.task.for_me_to_accept ) // STFU: sometimes it's 1, not '1'
        this.controller.get("accept-row").addClassName("generically-hidden");

    this.controller.setupWidget("group", {label: "group"}, this.groupModel={choices:[], value:t.group ? t.group : ''});

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

    var tdef = revqsplit(qsplit(t.tags));
    if( tdef === "<none>" )
        tdef = "";

    this.controller.setupWidget("tags",  this.boringAttributes,  this.tagsModel  = {value: tdef });
    this.controller.setupWidget("owner", this.preSelBAttributes, this.ownerModel = {value: t.owner});

    var prios = [
        {label: "Highest", value: "5", iconPath: 'img/highest.png' },
        {label: "High",    value: "4", iconPath: 'img/high.png'    },
        {label: "Normal",  value: "3", iconPath: 'img/normal.png'  },
        {label: "Low",     value: "2", iconPath: 'img/low.png'     },
        {label: "Lowest",  value: "1", iconPath: 'img/lowest.png'  }
    ];

    var initPrioIcon;

    this.controller.setupWidget("priority", {label: "priority", choices: prios}, this.priorityModel={value:t.priority});
    Mojo.Event.listen(this.controller.get("priority"), Mojo.Event.propertyChange, initPrioIcon = function() {
        var v = this.priorityModel.value;
        if(v) {
            for(var i=0; i<prios.length; i++)
                if( prios[i].value == v ) // STFU: sometimes this is 5 and sometimes "5"
                    this.controller.get("prio-img").src = prios[i].iconPath;
        }

    }.bind(this));

    initPrioIcon();

    this.controller.setupWidget("due-date",   this.preSelBAttributes, this.dueDateModel   = {value: t.due});
    this.controller.setupWidget("hide-until", this.preSelBAttributes, this.hideUntilModel = {value: t.starts});

    this.controller.setupWidget("every",      this.preSelNAttributes, this.everyModel     = {value: t.repeat_every});
    this.controller.setupWidget("heads-up",   this.preSelNAttributes, this.headsUpModel   = {value: t.repeat_days_before_due});

    var schedules = [
        {label: "Once",     value: "once"   },
        {label: "Daily",    value: "days"   },
        {label: "Weekly",   value: "weeks"  },
        {label: "Monthly",  value: "months" },
        {label: "Annually", value: "years"  }
    ];
    var sch = function() {
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

    }.bind(this);
    this.controller.setupWidget("schedule", {label: "schedule", choices: schedules}, this.scheduleModel={value:t.repeat_period});
    Mojo.Event.listen(this.controller.get("schedule"), Mojo.Event.propertyChange, sch);
    sch();

    var bfv = $A(t.but_first).map(function(i){ return "#" + id2rl(i); }).join(", ");
    var atv = $A(t.and_then ).map(function(i){ return "#" + id2rl(i); }).join(", ");

    this.controller.setupWidget("but-first", this.boringAttributes, this.butFirstModel = {value: bfv});
    this.controller.setupWidget("and-then",  this.boringAttributes, this.andThenModel  = {value: atv});

    this.controller.setupWidget("time-worked", this.preSelBAttributes, this.timeWorkedModel = {value: t.time_worked});
    this.controller.setupWidget("time-left",   this.preSelBAttributes, this.timeLeftModel   = {value: t.time_left});

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

    var params = {};

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

    if( f("acceptModel") ) // secondarily, only update if we haven't already accepted
        if( this.task.accepted != '1' ) // STFU: sometimes it's 1, not '1'
            params.accepted = v;
            // NOTE: sending a '0' actually declines, which has other side effects,
            // see notes.txt we might have a decline some day, but for now,
            // setting the owner to the requestor manually should be roughly
            // the same. see also: notes.txt 

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
    if( f("hiddenForeverModel") ) params.will_complete          = v=="1"?"0":"1"; // STFU: I mean to use ==

    if( f("tagsModel") ) {
        var q = qsplit(v);
        if( q ) params.tags = q.join(" ");
        else {
            this.E("EditTask::go()", "post error", "tag list must be space separated tokens with balanced quotes");
            return;
        }
    }

    Mojo.Log.info("EditTask::go() params: %s", Object.toJSON(params));

    var bf_compr = TMO.compareTextFieldDeps(this.butFirstModel._oVal, this.butFirstModel.value);
    var at_compr = TMO.compareTextFieldDeps( this.andThenModel._oVal,  this.andThenModel.value);

    var dep_did_stuff = bf_compr.toAdd.length + bf_compr.toDel.length
                      + at_compr.toAdd.length + at_compr.toDel.length;

    Mojo.Log.info("LOLWUT: %s", Object.toJSON({dds: dep_did_stuff, bf_compr: bf_compr, at_compr: at_compr }));

    if( !did_stuff && dep_did_stuff === 0 ) {
        this.E("EditTask::go()", "post error", "nothing changed, update not posted");

    } else {
        if( did_stuff )
            TMO.updateTask(params,this.task);

        var me = this;

        bf_compr.toAdd.each(function(id){ TMO.addButFirst(me.task.id, id); });
        bf_compr.toDel.each(function(id){ TMO.delButFirst(me.task.id, id); });

        at_compr.toAdd.each(function(id){ TMO.addButFirst(id, me.task.id); });
        at_compr.toDel.each(function(id){ TMO.delButFirst(id, me.task.id); });

        Mojo.Controller.stageController.popScene();
    }
};

EditTaskAssistant.prototype.handleCommand = function(event) {
    Mojo.Log.info("EditTask::handleCommand()");

    if (event.type === Mojo.Event.command) {
        var s_a = event.command.split(/\s*(?:@@)\s*/);

        switch (s_a[0]) {
            case 'go':
                Mojo.Log.info("EditTask::handleCommand(go)");
                this.go();
                break;

            default:
                Mojo.Log.info("EditTask::handleCommand(unknown command: %s)", Object.toJSON(s_a));
                break;
        }
    }

};

Mojo.Log.info('loaded(EditTask.js)');
