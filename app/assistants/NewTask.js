/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo AMO
*/

function NewTaskAssistant() {
    Mojo.Log.info("NewTask()");

    this.handleGroupListChange = this.handleGroupListChange.bind(this);
}

NewTaskAssistant.prototype.setup = function() {
    Mojo.Log.info("NewTask::setup()");

    this.titleAttributes = {autoFocus: true, multiline: false, textCase: Mojo.Widget.steModeLowerCase};
    this.controller.setupWidget("title", this.titleAttributes, this.titleModel = {});

    this.descriptionAttributes = {autoFocus: false, multiline: true, textCase: Mojo.Widget.steModeLowerCase};
    this.controller.setupWidget("description", this.descriptionAttributes, this.descriptionModel = {});
    this.controller.setupWidget("comment",     this.descriptionAttributes, this.commentModel     = {});

    this.controller.setupWidget("go", {}, this.goModel = {buttonClass: 'affirmative', label: "Submit"});
    this.controller.setupWidget("no", {}, this.noModel = {buttonClass: 'negative',  label: "Cancel"});

    this.boringAttributes = {multiline: false, textCase: Mojo.Widget.steModeLowerCase};
    this.controller.setupWidget("tags",       this.boringAttributes, this.tagsModel      = {});
    this.controller.setupWidget("owner",      this.boringAttributes, this.ownerModel     = {});
    this.controller.setupWidget("hide-until", this.boringAttributes, this.hideUntilModel = {});
    this.controller.setupWidget("due-date",   this.boringAttributes, this.dueDateModel   = {});

    this.controller.setupWidget("group", {label: "group"}, this.groupModel={value:'personal'});

    var prios = [
        {label: "Highest", value: "highest", iconPath: 'img/highest.png' },
        {label: "High",    value: "high",    iconPath: 'img/high.png'    },
        {label: "Normal",  value: "normal",  iconPath: 'img/normal.png'  },
        {label: "Low",     value: "low",     iconPath: 'img/low.png'     },
        {label: "Lowest",  value: "lowest",  iconPath: 'img/lowest.png'  }
    ];

    this.controller.setupWidget("priority", {label: "priority", choices: prios}, this.priorityModel={value:'normal'});
    Mojo.Event.listen(this.controller.get("priority"), Mojo.Event.propertyChange, function() {
        var v = this.priorityModel.value;
        if(v) {
            for(var i=0; i<prios.length; i++)
                if( prios[i].value === v )
                    this.controller.get("prio-img").src = prios[i].iconPath;
        }

    }.bind(this));

    Mojo.Event.listen(this.controller.get("go"), Mojo.Event.tap, this.go);
    Mojo.Event.listen(this.controller.get("no"), Mojo.Event.tap, this.no);

    var checkBoxAttributes = { trueValue: 'on', falseValue: 'off' };
    this.controller.setupWidget('hidden-forever', checkBoxAttributes, this.hiddenForeverModel = {value: "off"});

    this.handleGroupListChange([]); // kick it off
};


NewTaskAssistant.prototype.go = function() {
    Mojo.Log.info("NewTask::go()");

    // perl -ne 'print "    // $1\n" if m/(this[a-zA-Z.]+Model)/ and not $u{$1}++' app/assistants/NewTask.js 
    // [ ] this.titleModel
    // [ ] this.descriptionModel
    // [ ] this.commentModel
    // [ ] this.goModel
    // [ ] this.noModel
    // [ ] this.tagsModel
    // [ ] this.ownerModel
    // [ ] this.hideUntilModel
    // [ ] this.dueDateModel
    // [ ] this.groupModel
    // [ ] this.priorityModel
    // [ ] this.hiddenForeverModel

};

NewTaskAssistant.prototype.no = function() {
    Mojo.Log.info("NewTask::no()");
    Mojo.Controller.stageController.popScene();
};

NewTaskAssistant.prototype.handleGroupListChange = function(groups) {
    Mojo.Log.info("NewTask::handleGroupListChange()");

    var l = [{label: 'Personal', value: 'personal'}];

    try {
        // if( false )
        for(var i=0; i<groups.length; i++)
            l.push({label: groups[i].name, value: groups[i].id});

    } catch (e) { /* this just means groups was undefined, yawn */ }

    this.groupModel.choices = l;
    this.controller.modelChanged(this.groupModel);

    if( this.groupModel.choices.length >= 2 ) {
        this.controller.get("group-row").removeClassName("generically-hidden");

    } else {
        this.controller.get("group-row").addClassName("generically-hidden");
    }
};

NewTaskAssistant.prototype.activate = function() {
    Mojo.Log.info("NewTask::activate()");

    AMO.registerSrchgChange(this.handleGroupListChange);
};

NewTaskAssistant.prototype.deactivate = function() {
    Mojo.Log.info("NewTask::deactivate()");

    AMO.unregisterSrchgChange(this.handleGroupListChange);
};
