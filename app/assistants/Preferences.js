
/* {{{ */ function PreferencesAssistant() {
    Mojo.Log.info("Preferences()");

    var cookies = {};

    this.setCookie = function(x, val) {
        if(!cookies[x] )
            cookies[x] = new Mojo.Model.Cookie("prefs-" + x);

        cookies[x].put(val);
    };

    this.getCookie = function(x, def) {
        if(!cookies[x] )
            cookies[x] = new Mojo.Model.Cookie("prefs-" + x);

        var res = cookies[x].get();

        if( res === null || res === undefined )
            return def;

        return res;
    };

    this.SCa = Mojo.Controller.stageController.assistant;
    this.menuSetup = this.SCa.menuSetup.bind(this);

    this.loginListTap          = function(event){ this.SCa.showScene("EditAccount", {email: event.item.email}); }.bind(this);
    this.addAccountTap         = function(event){ this.SCa.showScene("AddAccount"); }.bind(this);
    this.rmAccountSlide        = function(event){ AMO.rmAccount(event.item.email); }.bind(this);
    this.handleLoginListChange = function(e){

        this.loginListModel.items = e;
        this.controller.modelChanged(this.loginListModel);

    }.bind(this);
}

/*}}}*/

/* {{{ /**/ PreferencesAssistant.prototype.setup = function() {
    Mojo.Log.info("Preferences::setup()");

    this.menuSetup();

    var loginListAttrs = {
        listTemplate:  'misc/regular-list-container',
        emptyTemplate: 'misc/empty-list',
        itemTemplate:  'misc/li-email',
        swipeToDelete: true,
        addItemLabel:  "Add..."
    };

    this.backModel = { label: "back",  icon: 'back', command: 'back' };
    this.commandMenuModel = {
        label: 'Task Command Menu',
        items: [ this.backModel ]
    };
	this.controller.setupWidget(Mojo.Menu.commandMenu, {menuClass: 'no-fade'}, this.commandMenuModel);

    this.loginListModel = {listTitle: 'Hiveminder Logins', items: [] };
    this.controller.setupWidget('hm_login_list', loginListAttrs, this.loginListModel);

    Mojo.Event.listen(this.controller.get('hm_login_list'), Mojo.Event.listTap,    this.loginListTap);
    Mojo.Event.listen(this.controller.get('hm_login_list'), Mojo.Event.listAdd,    this.addAccountTap);
    Mojo.Event.listen(this.controller.get('hm_login_list'), Mojo.Event.listDelete, this.rmAccountSlide);

    var  lockOrientationAttrs = { trueValue: true, falseValue: false };
    this.lockOrientationModel = { value: this.getCookie("lock-orientation", true) };
    this.controller.setupWidget('lock-orientation', lockOrientationAttrs, this.lockOrientationModel);

    Mojo.Event.listen(this.controller.get("lock-orientation"), Mojo.Event.propertyChange,
        this.considerLockOrientation = function() {
            if( this.lockOrientationModel.value ) {
                Mojo.Controller.stageController.lockOrientation();
                this.setCookie("lock-orientation", true);

            } else {
                Mojo.Controller.stageController.freeOrientation();
                this.setCookie("lock-orientation", false);
            }

        }.bind(this));

    this.considerLockOrientation();
};

/*}}}*/

/* {{{ /**/ PreferencesAssistant.prototype.activate = function() {
    Mojo.Log.info("Preferences::activate()");
    AMO.registerLoginChange(this.handleLoginListChange);
};

/*}}}*/
/* {{{ /**/ PreferencesAssistant.prototype.deactivate = function() {
    Mojo.Log.info("Preferences::deactivate()");
    AMO.unregisterLoginChange(this.handleLoginListChange);
};

/*}}}*/

/* {{{ */ PreferencesAssistant.prototype.handleCommand = function(event) {
    if (event.type === Mojo.Event.command) {
        var s_a = event.command.split(/\s*(?:@@)\s*/);

        if( s_a.length > 0 )
            Mojo.Log.info("Prefs::handleCommand(%s) [rl=%s]", s_a[0], rl);

        switch (s_a[0]) {
            case 'back';
                Mojo.Controller.stageController.popScene()
                break;

            default:
                Mojo.Log.info("Prefs::handleCommand(unknown command: %s) [rl=%s]", Object.toJSON(s_a), rl);
                break;
        }
    }
};

Mojo.Log.info('loaded(Preferences.js)');
