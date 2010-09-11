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
    this.controller.setupWidget("title", this.titleAttributes, this.titleModel={}); 

    this.descriptionAttributes = {autoFocus: false, multiline: true, textCase: Mojo.Widget.steModeLowerCase};
    this.controller.setupWidget("description", this.descriptionAttributes, this.descriptionModel={}); 

    this.controller.setupWidget("go", {}, this.goModel = {buttonClass: 'affirmative', label: "Send"}); 
    this.controller.setupWidget("no", {}, this.noModel = {buttonClass: 'negative',  label: "Cancel"}); 

    this.boringAttributes = {multiline: false, textCase: Mojo.Widget.steModeLowerCase};
    this.controller.setupWidget("tags",  this.boringAttributes, this.tagsModel={}); 

    this.controller.setupWidget("group", {label: "group"}, this.groupModel={choices: []}); 

    var prios = [
        {label: "Highest", value: "highest", iconPath: 'img/highest.png' },
        {label: "High",    value: "high",    iconPath: 'img/high.png'    },
        {label: "Normal",  value: "normal",  iconPath: 'img/normal.png'  },
        {label: "Low",     value: "low",     iconPath: 'img/low.png'     },
        {label: "Lowest",  value: "lowest",  iconPath: 'img/lowest.png'  }
    ];

    this.controller.setupWidget("priority", {label: "priority", choices: prios}, this.priorityModel={});

    Mojo.Event.listen(this.controller.get("go"), Mojo.Event.tap, this.go);
    Mojo.Event.listen(this.controller.get("no"), Mojo.Event.tap, this.no);

    this.handleGroupListChange([]); // kick it off
};


NewTaskAssistant.prototype.go = function() {
    Mojo.Log.info("NewTask::go()");
};

NewTaskAssistant.prototype.no = function() {
    Mojo.Log.info("NewTask::no()");
    Mojo.Controller.stageController.popScene();
};

NewTaskAssistant.prototype.handleGroupListChange = function(groups) {
    Mojo.Log.info("NewTask::handleGroupListChange()");

    var l = [{label: '', value: ''}];

    try {
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
