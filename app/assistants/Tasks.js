
function TasksAssistant() {
    Mojo.Log.info("Tasks()");

    this.SCa = Mojo.Controller.stageController.assistant;
    this.menuSetup = this.SCa.menuSetup.bind(this);
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
};

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

    if( !this.firstHC ) {
        this.firstHC = true;

        if( emails.length < 1 )
            this.SCa.showScene("Preferences");
    }
};

/*}}}*/

/* {{{ /**/ TasksAssistant.prototype.activate = function() {
    Mojo.Log.info("Tasks::activate()");

    AMO.registerLoginChange(this.handleLoginChange);
};

/*}}}*/
/* {{{ /**/ TasksAssistant.prototype.deactivate = function() {
    Mojo.Log.info("Tasks::deactivate()");
    AMO.unregisterLoginChange(this.handleLoginListChange);
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
