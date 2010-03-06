
function TasksAssistant() {
    Mojo.Log.info("Tasks()");

    this.SCa = Mojo.Controller.stageController.assistant;
    this.menuSetup = this.SCa.menuSetup.bind(this);
    this.handleLoginChange = this.handleLoginChange.bind(this);
    this.handleTasksChange = this.handleTasksChange.bind(this);
    this.checkForLogins = this.checkForLogins.bind(this);
}

/* {{{ /**/ TasksAssistant.prototype.setup = function() {
    Mojo.Log.info("Tasks::setup()");

    this.menuSetup();

    this.commandMenuModelCurrentLoginTemplate = function(a) { return {label: a, submenu: 'login-submenu'}; };
    this.commandMenuModel = { label: $L('Tasks Command Menu'), items: [{},{},{}] };
    this.loginSubmenu = { label: $L('Login Submenu'), items: [] };
	this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.commandMenuModel);
	this.controller.setupWidget('login-submenu', undefined, this.loginSubmenu);

    var test = [
        {record_locator: 'test1', summary: "supz, test1"},
        {record_locator: 'test2', summary: "supz, test2"},
        {record_locator: 'test3', summary: "supz, test3"},
    ];

    this.tasksListAttrs = {
        listTemplate:  'misc/lc1',
        emptyTemplate: 'misc/le1',
        itemTemplate:  'misc/li-task',
        swipeToDelete: true
    };
    this.tasksListModel = {listTitle: $L('Hiveminder Tasks'), items: test};
    this.controller.setupWidget('hm_task_list', this.tasksListAttrs, this.tasksListModel);

    this.checkForLogins();
};

/*}}}*/
/* {{{ /**/ TasksAssistant.prototype.checkForLogins = function() {
    Mojo.Log.info("Tasks::checkForLogins()");

    var lc = AMO.getLoginCount();

    if( lc < 0 ) {
        setTimeout(this.checkForLogins, 500);
        return;
    }

    if( lc < 1 )
        this.SCa.showScene("Preferences");
}

/*}}}*/
/* {{{ /**/ TasksAssistant.prototype.handleLoginChange = function(emails,current) {
    Mojo.Log.info("Tasks::handleLoginChange(current=%s)", current);

    if( current ) {
        this.commandMenuModel.items[2] = emails.length>1 ? this.commandMenuModelCurrentLoginTemplate(current) : { label: current };
        var items = this.loginSubmenu.items = [];
        for(var i=0; i<emails.length; i++)
            items.push({ label: emails[i].email, command: "login-as @@ " + emails[i].email });

    } else {
        this.commandMenuModel.items[2] = {};
        this.loginSubmenu.items = [];

        if( emails.length>0 )
            AMO.switchTo( emails[0].email );
    }

    this.controller.modelChanged(this.commandMenuModel);
};

/*}}}*/
/* {{{ /**/ TasksAssistant.prototype.handleTasksChange = function(tasks) {
    Mojo.Log.info("Tasks::handleTasksChange(tasks=%s)", tasks);

    this.controller.modelChanged(this.tasksListModel);
};

/*}}}*/

/* {{{ /**/ TasksAssistant.prototype.activate = function() {
    Mojo.Log.info("Tasks::activate()");

    AMO.registerLoginChange(this.handleLoginChange);
    TMO.registerTasksChange(this.handleTasksChange);
};

/*}}}*/
/* {{{ /**/ TasksAssistant.prototype.deactivate = function() {
    Mojo.Log.info("Tasks::deactivate()");

    AMO.unregisterLoginChange(this.handleLoginChange);
    TMO.unregisterTasksChange(this.handleTasksChange);
};

/*}}}*/

/* {{{ /**/ TasksAssistant.prototype.handleCommand = function(event) {
    Mojo.Log.info("Tasks::handleCommand(command)");

    if (event.type === Mojo.Event.command) {
        var s_a = event.command.split(/\s*(?:@@)\s*/)

        switch (s_a[0]) {
            case "login-as":
                Mojo.Log.info("Tasks::handleCommand(login-as: %s)", s_a[1]);
                AMO.switchTo(s_a[1]);
                break;
        }
    }

}

/*}}}*/

Mojo.Log.info('loaded(Tasks.js)');
