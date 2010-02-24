
function TasksAssistant() {
    Mojo.Log.info("Tasks()");

    this.SC = Mojo.Controller.stageController.assistant;
    this.menuSetup = this.SC.menuSetup.bind(this);
}

/* {{{ /**/ TasksAssistant.prototype.setup = function() {
    Mojo.Log.info("Tasks::setup()");

    this.menuSetup();

    this.commandMenuModel = { label: $L('Tasks Command Menu'), 
        items: [{},{},{label: "cool", hidden: true, submenu:'login-submenu'}]
    };		
	this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.commandMenuModel);		

    this.loginSubmenu = { label: $L('Login Submenu'),
        items: [
            {label: "test1", command: "test1"},
            {label: "test2", command: "test2"},
            {label: "test3", command: "test3"},
            {label: "test4", command: "test4"}
        ]
    };
	this.controller.setupWidget('login-submenu', undefined, this.loginSubmenu);	
};

/*}}}*/

Mojo.Log.info('loaded(Tasks.js)');
