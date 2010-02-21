function EditAccountAssistant(args) {
    Mojo.Log.info("EditAccount(email:%s)", args.email);

    this.SC  = Mojo.Controller.stageController;
    this.SCa = this.SC.assistant;

    this.emailArg = args.email;

    this.menuSetup = this.SCa.menuSetup.bind(this);

    this.updateAccount   = this.updateAccount   .bind(this);
    this.checkedUserPass = this.checkedUserPass .bind(this);
    this.failedUserPass  = this.failedUserPass  .bind(this);
}

/* {{{ /**/ EditAccountAssistant.prototype.setup = function() {
    Mojo.Log.info("EditAccount::setup()");

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

    this.eModel = { value: this.emailArg };
    this.pModel = { value: AMO.getPasswdForEmail(this.emailArg) };

    this.controller.setupWidget('emailtf', eAttributes, this.eModel );
    this.controller.setupWidget('passtf',  pAttributes, this.pModel );

    this.controller.setupWidget('edit_button', {type: Mojo.Widget.activityButton}, {label: "Update Account"} );
    Mojo.Event.listen($("edit_button"), Mojo.Event.tap, this.updateAccount);
};

/*}}}*/
/* {{{ /**/ EditAccountAssistant.prototype.nospin = function(event) {
    $('edit_button').mojo.deactivate();
    this.spinning = false;
};

/*}}}*/
/* {{{ /**/ EditAccountAssistant.prototype.noticedUpdate = function(value) {
    Mojo.Log.info("EditAccount::noticedUpdate(value=%s)", value);
    this.SC.popScene();
};

/*}}}*/

/* {{{ /**/ EditAccountAssistant.prototype.checkedUserPass = function(email, pass, r) {
    Mojo.Log.info("EditAccount::checkedUserPass(email=%s)", email);

    this.nospin();

    AMO.rmAccount(this.emailArg);
    AMO.addReplaceAccount(email,pass);

    // 18:00:00: org.voltar.hiveminder: Info: AccountManager::login() r.success
    // r={"success": 1, "content": {}, "action_class": "BTDT::Action::Login",
    // "field_errors": {}, "message": "Welcome back, Paul Miller (work).",
    // "failure": 0, "error": null, "field_warnings": {}}

    this.controller.showAlertDialog({
        onChoose: this.noticedUpdate,
        title:    'Account Updated',
        message:  r.message,
        choices:  [ {label: 'OK', value: 'OK', type: 'color'} ]
    });
};

/*}}}*/
/* {{{ /**/ EditAccountAssistant.prototype.failedUserPass = function(e) {
    Mojo.Log.info("EditAccount::failedUserPass()");
    this.nospin();

    return true; // continue with the usual error processing
};

/*}}}*/
/* {{{ /**/ EditAccountAssistant.prototype.updateAccount = function() {
    Mojo.Log.info("EditAccount::updateAccount() eModel=%s", Object.toJSON(this.eModel));

    var email = this.eModel.value.strip().toLowerCase();
    var pass  = this.pModel.value.strip();

    if( this.spinning ) return;
        this.spinning = true;

    AMO.login(email, pass, this.checkedUserPass, this.failedUserPass);
};

/*}}}*/

Mojo.Log.info('loaded(EditAccount.js)');
