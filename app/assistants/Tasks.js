/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo Template palmGetResource setTimeout TMO OPT AMO
*/

function TasksAssistant() {
    Mojo.Log.info("Tasks()");

    this.SCa = Mojo.Controller.stageController.assistant;

    this.menuSetup         = this.SCa.menuSetup.bind(this);
    this.handleLoginChange = this.handleLoginChange.bind(this);
    this.handleSrchlChange = this.handleSrchlChange.bind(this);
    this.handleTasksChange = this.handleTasksChange.bind(this);
    this.checkForLogins    = this.checkForLogins.bind(this);
    this.taskListTap       = this.taskListTap.bind(this);
    this.taskListSwipe     = this.taskListSwipe.bind(this);

    this.taskTemplate = new Mojo.View.Template(palmGetResource(Mojo.appPath + "app/views/tt/task-short.html"),
        "task-short", Mojo.View.escapeHTMLInTemplates);
}

/* {{{ */ TasksAssistant.prototype.setup = function() {
    Mojo.Log.info("Tasks::setup()");

    this.menuSetup();

    this.refreshModel = { label: "Reload", icon: 'refresh', command: 'refresh' };
    this.searchModel  = { label: "Search", icon: 'search',  submenu: 'search-submenu' };
    this.newModel     = { label: "New",    icon: 'new',     command: 'new' };

    this.commandMenuModelCurrentLoginTemplate = function(a) { return {label: a, width: 150, submenu: 'login-submenu'}; };
    this.commandMenuModel = { label: 'Tasks Command Menu', items: [
       { items: [this.refreshModel, this.searchModel, this.newModel] }, {/* populated by handleLoginChange */} ] };

    this.loginSubmenu  = { label: 'Login Submenu',  items: [] };
    this.searchSubmenu = { label: 'Search Submenu', items: [] };

	this.controller.setupWidget(Mojo.Menu.commandMenu, {menuClass: 'no-fade'}, this.commandMenuModel);
	this.controller.setupWidget('login-submenu',  undefined, this.loginSubmenu);
	this.controller.setupWidget('search-submenu', undefined, this.searchSubmenu);

    this.tasksListAttrs = {
        listTemplate:  'misc/naked-list-container',
        emptyTemplate: 'misc/empty-list',
        itemTemplate:  'misc/li-task',
        swipeToDelete: true
    };
    this.tasksListModel = {listTitle: 'Hiveminder Tasks', items: ['...']};
    this.controller.setupWidget('hm_task_list', this.tasksListAttrs, this.tasksListModel);

	Mojo.Event.listen(this.controller.get("hm_task_list"), Mojo.Event.listTap,    this.taskListTap);
	Mojo.Event.listen(this.controller.get("hm_task_list"), Mojo.Event.listDelete, this.taskListSwipe);

    this.checkForLogins();
    this.firstActivation = true;

};

/*}}}*/

/* {{{ */ TasksAssistant.prototype.taskListTap = function(event) {
    Mojo.Log.info("Tasks::taskListTap(%s)", event.item.record_locator);

    this.SCa.showScene("Task", event.item);

};

/*}}}*/
/* {{{ */ TasksAssistant.prototype.taskListSwipe = function(event) {
    Mojo.Log.info("Tasks::taskListSwipe(%s)", event.item.record_locator);

    TMO.deleteTask(event.item);

    // NOTE: I don't think I need to do this stuff... swiping moves them out of
    // the list and the next activate or handleTasksChange will update this for me anyway.
        // this.tasksListModel.items.reject(function(i) { return i===event.item });
        // this.controller.modelChanged(this.tasksListModel);
};

/*}}}*/

/* {{{ */ TasksAssistant.prototype.checkForLogins = function() {
    Mojo.Log.info("Tasks::checkForLogins()");

    var lc = AMO.getLoginCount();

    if( lc < 0 ) {
        setTimeout(this.checkForLogins, 500);
        return;
    }

    if( lc < 1 )
        this.SCa.showScene("Preferences");
};

/*}}}*/
/* {{{ */ TasksAssistant.prototype.handleLoginChange = function(emails,current) {
    Mojo.Log.info("Tasks::handleLoginChange(current=%s)", current);

    var x = this.commandMenuModel.items.length -1;

    if( current ) {
        this.commandMenuModel.items[x] = emails.length>1
                                       ? this.commandMenuModelCurrentLoginTemplate(current)
                                       : { label: current, width: 150 };

        var items = this.loginSubmenu.items = [];

        for(var i=0; i<emails.length; i++)
            items.push({ label: emails[i].email, command: "login-as @@ " + emails[i].email });

    } else {
        this.commandMenuModel.items[x] = {};
        this.loginSubmenu.items = [];

        if( emails.length>0 )
            AMO.switchTo( emails[0].email );
    }

    this.controller.modelChanged(this.commandMenuModel);
};

/*}}}*/
/* {{{ */ TasksAssistant.prototype.handleSrchlChange = function() {
    Mojo.Log.info("Tasks::handleSrchlChange()");

    var i,n;

    this.searchSubmenu.items = [{label: "<custom>", command: 'search @@ <custom>'}];

    var sn = TMO.getSearchNames();

    // NOTE: the task manager asks the account manager for lists from preminum accounts
    // do not do that here

    for(i=0; i<=sn.length; n=sn[i++])
        this.searchSubmenu.items.push({ label: n, command: 'search @@ ' + n + " @@ sn"});

    this.controller.modelChanged(this.commandMenuModel);
};

/*}}}*/
/* {{{ */ TasksAssistant.prototype.handleTasksChange = function(tasks, lastSearch) {
    Mojo.Log.info("Tasks::handleTasksChange()");

    this.tasksListModel.items = tasks;

    tasks.each(function(t) {

        t.short = this.taskTemplate.evaluate(t);

        if( OPT._preTapTask )
            if( t.record_locator === OPT._preTapTask || t.id === OPT._preTapTask )
                this.SCa.showScene("Task", t);

    }.bind(this));

    this.controller.modelChanged(this.tasksListModel);
    this.controller.get("current-search").innerHTML = "&quot;" + lastSearch.replace(/\//g, " ") + "&quot;";
};

/*}}}*/

/* {{{ */ TasksAssistant.prototype.activate = function() {
    Mojo.Log.info("Tasks::activate()");

    if( this.firstActivation ) {
        // make the empty-list template show up on the initial load
        this.tasksListModel.items=[]; this.controller.modelChanged(this.tasksListModel);
        this.firstActivation = false;
        this.controller.get("current-search").innerHTML = "... loading ...";
    }

    AMO.registerLoginChange(this.handleLoginChange);
    AMO.registerSrchlChange(this.handleSrchlChange);
    TMO.registerTasksChange(this.handleTasksChange);
};

/*}}}*/
/* {{{ */ TasksAssistant.prototype.deactivate = function() {
    Mojo.Log.info("Tasks::deactivate()");

    AMO.unregisterLoginChange(this.handleLoginChange);
    AMO.unregisterSrchlChange(this.handleSrchlChange);
    TMO.unregisterTasksChange(this.handleTasksChange);
};

/*}}}*/

/* {{{ */ TasksAssistant.prototype.handleCommand = function(event) {
    Mojo.Log.info("Tasks::handleCommand()");

    if (event.type === Mojo.Event.command) {
        var s_a = event.command.split(/\s*(?:@@)\s*/);

        switch (s_a[0]) {
            case 'refresh':
                Mojo.Log.info("Tasks::handleCommand(refresh)");
                TMO.searchTasks(false, true); // use last search and force the reload
                break;

            case "login-as":
                Mojo.Log.info("Tasks::handleCommand(login-as: %s)", s_a[1]);
                AMO.switchTo(s_a[1]);
                break;

            case 'search':
                Mojo.Log.info("Tasks::handleCommand(search: %s)", s_a[1]);
                if( s_a[1] === "<custom>" ) {
                    this.SCa.showScene('Search');

                } else {
                    TMO.namedSearchTasks(s_a[1], false); // use named search and allow a cached reload
                }
                break;

            case 'new':
                Mojo.Log.info("Tasks::handleCommand(search: %s)", s_a[1]);
                this.SCa.showScene('NewTask');
                break;

            default:
                Mojo.Log.info("Tasks::handleCommand(unknown command: %s)", Object.toJSON(s_a));
                break;
        }
    }

};

/*}}}*/

Mojo.Log.info('loaded(Tasks.js)');
