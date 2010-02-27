
function TasksAssistant() {
    Mojo.Log.info("Tasks()");

    this.SC = Mojo.Controller.stageController.assistant;
    this.menuSetup = this.SC.menuSetup.bind(this);
    this.handleLoginChange = this.handleLoginChange.bind(this);
}

/* {{{ /**/ TasksAssistant.prototype.setup = function() {
    Mojo.Log.info("Tasks::setup()");

    this.menuSetup();

    this.commandMenuModelCurrentLoginTemplate = function(a) { return {label: a, submenu: 'login-submenu'}; };
    this.commandMenuModel = { label: $L('Tasks Command Menu'), items: [{},{},{}] };
    this.loginSubmenu = { label: $L('Login Submenu'), items: [] };
	this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.commandMenuModel);
	this.controller.setupWidget('login-submenu', undefined, this.loginSubmenu);

    AMO.registerLoginChange(this.handleLoginChange);
};

/*}}}*/
/* {{{ /**/ TasksAssistant.prototype.handleLoginChange = function(emails,current) {
    Mojo.Log.info("Tasks::handleLoginChange(current=%s)", current);

    if( current ) {
        this.commandMenuModel.items[2] = emails.length>1 ? this.commandMenuModelCurrentLoginTemplate(current) : { label: current };
        var items = this.loginSubmenu.items = [];
        for(var i=0; i<emails.length; i++)
            items.push({ label: emails[i].email, command: "loginas@@" + emails[i].email });

    } else {
        this.commandMenuModel.items[2] = {};
        this.loginSubmenu.items = [];
    }

    this.controller.modelChanged(this.loginSubmenu);
    this.controller.modelChanged(this.commandMenuModel);
};

/*}}}*/

Mojo.Log.info('loaded(Tasks.js)');
