function CreateAccountAssistant() {
    Mojo.Log.info("CreateAccount()");

    this.SC = Mojo.Controller.stageController.assistant;
    this.menuSetup = this.SC.menuSetup.bind(this);
    this.createAccount = this.createAccount.bind(this);
    this.checkedUserPass = this.checkedUserPass.bind(this);
    this.failedUserPass = this.failedUserPass.bind(this);
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

    this.eModel = { original: '' };
    this.pModel = { original: '' };

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
/* {{{ /**/ CreateAccountAssistant.prototype.checkedUserPass = function(email, pass, r) {
    Mojo.Log.info("CreateAccount::checkedUserPass(email=%s)", email);
    this.nospin();
    AMO.addReplaceAccount(email,pass);
};

/*}}}*/
/* {{{ /**/ CreateAccountAssistant.prototype.failedUserPass = function(e) {
    Mojo.Log.info("CreateAccount::failedUserPass()");
    this.nospin();

    return true; // continue with the usual error processing
};

/*}}}*/
/* {{{ /**/ CreateAccountAssistant.prototype.createAccount = function() {
    Mojo.Log.info("CreateAccount::createAccount()");

    var email = this.eModel.original.strip().toLowerCase();
    var pass  = this.pModel.original.strip();

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
