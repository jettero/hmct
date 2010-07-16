function AddAccountAssistant() {
    Mojo.Log.info("AddAccount()");

    this.SC  = Mojo.Controller.stageController;
    this.SCa = this.SC.assistant;

    this.menuSetup       = this.SCa.menuSetup   .bind(this);
    this.addAccount      = this.addAccount   .bind(this);
    this.checkedUserPass = this.checkedUserPass .bind(this);
    this.failedUserPass  = this.failedUserPass  .bind(this);

    this.e = new ErrorDialog("AddAccount");
    this.E = this.e.showError;
}

/* {{{ /**/ AddAccountAssistant.prototype.setup = function() {
    Mojo.Log.info("AddAccount::setup()");

    this.menuSetup();

    var eAttributes = {
        textCase: Mojo.Widget.steModeLowerCase,
        hintText: 'email address',
        textFieldName: "emailtf"
    };

    var pAttributes = {
        hintText: 'secret password',
        textFieldName: "passtf"
    };

    this.eModel = { value: '' };
    this.pModel = { value: '' };

    this.controller.setupWidget('emailtf', eAttributes, this.eModel );
    this.controller.setupWidget('passtf',  pAttributes, this.pModel );

    this.controller.setupWidget('add_button', {type: Mojo.Widget.activityButton}, {label: "Add Account"} );
    Mojo.Event.listen($("add_button"), Mojo.Event.tap, this.addAccount)
};

/*}}}*/
/* {{{ /**/ AddAccountAssistant.prototype.nospin = function(event) {
    $('add_button').mojo.deactivate();
    this.spinning = false;
};

/*}}}*/
/* {{{ /**/ AddAccountAssistant.prototype.noticedAddition = function(value) {
    Mojo.Log.info("AddAccount::noticedAddition(value=%s)", value);
    this.SC.popScene();
};

/*}}}*/

/* {{{ /**/ AddAccountAssistant.prototype.checkedUserPass = function(email, pass, r) {
    Mojo.Log.info("AddAccount::checkedUserPass(email=%s)", email);

    this.nospin();
    AMO.addReplaceAccount(email,pass);

    // 18:00:00: org.voltar.hiveminder: Info: AccountManager::login() r.success
    // r={"success": 1, "content": {}, "action_class": "BTDT::Action::Login",
    // "field_errors": {}, "message": "Welcome back, Paul Miller (work).",
    // "failure": 0, "error": null, "field_warnings": {}}

    this.controller.showAlertDialog({
        onChoose: this.noticedAddition,
        title:    'Account Addd',
        message:  r.message,
        choices:  [ {label: 'OK', value: 'OK', type: 'color'} ]
    });
};

/*}}}*/
/* {{{ /**/ AddAccountAssistant.prototype.failedUserPass = function(e) {
    Mojo.Log.info("AddAccount::failedUserPass()");
    this.nospin();

    return true; // continue with the usual error processing
};

/*}}}*/
/* {{{ /**/ AddAccountAssistant.prototype.addAccount = function() {
    Mojo.Log.info("AddAccount::addAccount()");

    var email = this.eModel.value.strip().toLowerCase();
    var pass  = this.pModel.value.strip();

    if( this.spinning ) return;
        this.spinning = true;

    if (AMO.hasAccount(email)) {
        this.E("addAccount", "add", 'You already have an account named \"' + email + '\".  Edit it instead.');
        this.nospin();
        return;
    }

    AMO.login(email, pass, this.checkedUserPass, this.failedUserPass);
};

/*}}}*/

Mojo.Log.info('loaded(AddAccount.js)');
