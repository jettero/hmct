function CreateAccountAssistant() {
    Mojo.Log.info("CreateAccount()");

    this.SC  = Mojo.Controller.stageController;
    this.SCa = this.SC.assistant;

    this.menuSetup       = this.SCa.menuSetup   .bind(this);
    this.createAccount   = this.createAccount   .bind(this);
    this.checkedUserPass = this.checkedUserPass .bind(this);
    this.failedUserPass  = this.failedUserPass  .bind(this);
}

/* {{{ /**/ CreateAccountAssistant.prototype.setup = function() {
    Mojo.Log.info("CreateAccount::setup()");

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

    this.controller.setupWidget('create_button', {type: Mojo.Widget.activityButton}, {label: "Create Account"} );
    Mojo.Event.listen($("create_button"), Mojo.Event.tap, this.createAccount)
};

/*}}}*/
/* {{{ /**/ CreateAccountAssistant.prototype.nospin = function(event) {
    $('create_button').mojo.deactivate();
    this.spinning = false;
};

/*}}}*/
/* {{{ /**/ CreateAccountAssistant.prototype.noticedCreation = function(value) {
    Mojo.Log.info("CreateAccount::noticedCreation(value=%s)", value);
    this.SC.popScene();
};

/*}}}*/

/* {{{ /**/ CreateAccountAssistant.prototype.checkedUserPass = function(email, pass, r) {
    Mojo.Log.info("CreateAccount::checkedUserPass(email=%s)", email);

    this.nospin();
    AMO.addReplaceAccount(email,pass);

    // 18:00:00: org.voltar.hiveminder: Info: AccountManager::login() r.success
    // r={"success": 1, "content": {}, "action_class": "BTDT::Action::Login",
    // "field_errors": {}, "message": "Welcome back, Paul Miller (work).",
    // "failure": 0, "error": null, "field_warnings": {}}

    this.controller.showAlertDialog({
        onChoose: this.noticedCreation,
        title:    'Account Created',
        message:  r.message,
        choices:  [ {label: 'OK', value: 'OK', type: 'color'} ]
    });
};

/*}}}*/
/* {{{ /**/ CreateAccountAssistant.prototype.failedUserPass = function(e) {
    Mojo.Log.info("CreateAccount::failedUserPass()");
    this.nospin();

    return true; // continue with the usual error processing
};

/*}}}*/
/* {{{ /**/ CreateAccountAssistant.prototype.createAccount = function() {
    Mojo.Log.info("CreateAccount::createAccount() eModel=%s; pModel=%s",
        Object.toJSON(this.eModel),
        Object.toJSON(this.pModel)
    );

    var email = this.eModel.value.strip().toLowerCase();
    var pass  = this.pModel.value.strip();

    if( this.spinning ) return;
        this.spinning = true;

    if (AMO.hasAccount(email)) {
        Mojo.Controller.errorDialog('You already have an account named \"' + email + '\".  Edit it instead.');
        this.nospin();
        return;
    }

    AMO.login(email, pass, this.checkedUserPass, this.failedUserPass);
};

/*}}}*/
