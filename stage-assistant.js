var AMO, TMO, BBO, OPT, REQ;

function StageAssistant() {
	Mojo.Log.info("StageAssistant()")

    OPT = Mojo.loadJSONFile(Mojo.appPath + "runtime_options.json");

    BBO = new BusyBee();

    REQ = new RequestEngine();
    AMO = new AccountManager();
    TMO = new TaskManager();
}

StageAssistant.prototype.setup = function() {
	Mojo.Log.info("StageAssistant()::setup()")

    this.controller.assistant.showScene(OPT.altStartPage ? OPT.altStartPage : 'Tasks');

    this.controller.lockOrientation = function() {
        this.setWindowOrientation(this.getWindowOrientation());
    };

    this.controller.freeOrientation = function() {
        this.setWindowOrientation("free");
    };
}

StageAssistant.prototype.showScene = function (sceneName, args) {
	Mojo.Log.info("StageAssistant()::showScene(%s)", sceneName)

	if (args === undefined) {
		this.controller.pushScene({name: sceneName, sceneTemplate: sceneName});

	} else {
		this.controller.pushScene({name: sceneName, sceneTemplate: sceneName}, args);
	}
};

StageAssistant.prototype.handleCommand = function(event) {
    // this.controller = Mojo.Controller.stageController.activeScene();
    // I have this bound to the current scene, so ... this isn't necessary

    if(event.type == Mojo.Event.command) {
        Mojo.Log.info("executing menu command: %s", event.command);

        var a;

        if( a = event.command.match(/^myshow-(.+)/) )
            Mojo.Controller.stageController.assistant.showScene(a[1]);

        if( event.command === "refresh-login" )
            AMO.refreshCurrentLogin();
    }
}

StageAssistant.prototype.menuSetup = function() {
    this.appMenuModel = {
        visible: true,
        items: [
            { label: "Help",                   command: 'myshow-Help'        },
            { label: "About",                  command: 'myshow-About'       },
            { label: "Preferences & Accounts", command: 'myshow-Preferences' },
            { label: "Refresh Current Login",  command: 'refresh-login'      }
        ]
    };

    this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, this.appMenuModel);
}

Mojo.Log.info('loaded(stage-assistant.js)');
