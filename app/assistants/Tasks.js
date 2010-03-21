
function TasksAssistant() {
    Mojo.Log.info("Tasks()");

    this.SCa = Mojo.Controller.stageController.assistant;
    this.menuSetup         = this.SCa.menuSetup.bind(this);
    this.handleLoginChange = this.handleLoginChange.bind(this);
    this.handleTasksChange = this.handleTasksChange.bind(this);
    this.checkForLogins    = this.checkForLogins.bind(this);
    this.taskListTap       = this.taskListTap.bind(this);
    this.taskTemplate      = new Template(palmGetResource(Mojo.appPath + "app/views/tt/task-short.html"));
}

/* {{{ /**/ TasksAssistant.prototype.setup = function() {
    Mojo.Log.info("Tasks::setup()");

    this.menuSetup();

    this.refreshModel = { label: "Reload", icon: 'refresh', command: 'refresh' };

    this.commandMenuModelCurrentLoginTemplate = function(a) { return {label: a, submenu: 'login-submenu'}; };
    this.commandMenuModel = { label: 'Tasks Command Menu', items: [
       this.refreshModel, {}, {/* populated by handleLoginChange */} ] };

    this.loginSubmenu = { label: 'Login Submenu', items: [] };

	this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.commandMenuModel);
	this.controller.setupWidget('login-submenu', undefined, this.loginSubmenu);

    this.tasksListAttrs = {
        listTemplate:  'misc/naked-list-container',
        emptyTemplate: 'misc/empty-list',
        itemTemplate:  'misc/li-task',
        swipeToDelete: true
    };
    this.tasksListModel = {listTitle: 'Hiveminder Tasks', items: []};
    this.controller.setupWidget('hm_task_list', this.tasksListAttrs, this.tasksListModel);

	Mojo.Event.listen(this.controller.get("hm_task_list"), Mojo.Event.listTap, this.taskListTap);

    this.checkForLogins();
};

/*}}}*/

/* {{{ */ TasksAssistant.prototype.taskListTap = function(event) {
    Mojo.Log.info("Tasks::taskListTap(%s)", event.item.record_locator);

    this.SCa.showScene("Task", event.item);

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
    Mojo.Log.info("Tasks::handleTasksChange(tasks=%s)", Object.toJSON(tasks));

    this.tasksListModel.items = tasks;
    tasks.each(function(t) {

        t.short = this.taskTemplate.evaluate(t);

    }.bind(this));

    this.controller.modelChanged(this.tasksListModel);

    // XXX: this is just while we're working on the Task view
    if( tasks.length > 3 ) this.SCa.showScene("Task", tasks[3]);
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
            case 'refresh':
                Mojo.Log.info("Tasks::handleCommand(refresh)");
                TMO.searchTasks(false,true); // use last search and force the reload
                break;

            case "login-as":
                Mojo.Log.info("Tasks::handleCommand(login-as: %s)", s_a[1]);
                AMO.switchTo(s_a[1]);
                break;
        }
    }

}

/*}}}*/

Mojo.Log.info('loaded(Tasks.js)');
