
function AccountManager() {
    Mojo.Log.info("AccountManager()");

    this.login = this.login.bind(this);
}

AccountManager.prototype.login(email,pass,callback) = function() {
    Mojo.Log.info("AccountManager::login(email=%s)", email);

    var request = new Ajax.Request('https://hiveminder.com/=/action/BTDT.Action.Login.json', {
        method: 'post', parameters: { address: email, password: pass }, evalJSON: true,

        onSuccess: function(transport) {
            if( transport.status == 200 ) {
                var r = transport.responseJSON;
                if( r ) {
                    if( r.success ) {
                        Mojo.Log.info("AccountManager::login() r.success r=%s", Object.toJSON(r));
                        callback(r);

                    } else {
                        Mojo.Log.info("AccountManager::login() r.fail, r=%s", Object.toJSON(r));
                        var e = [];

                        if( r.error )
                            e.push($L(r.error));

                        for(var k in r.field_errors )
                            e.push($L(k + "-error: " + r.field_errors[k]));

                        if( !e.length )
                            e.push($L("Something went wrong with the login ..."));

                        if( this.f(e) )
                            Mojo.Controller.errorDialog(e.join("... "));
                    }

                } else {
                    Mojo.Log.info("AccountManager::login() sent [kinda bad]: r=%s", Object.toJSON(r));
                    var e = ["Unknown error issuing hiveminder login, huh"];

                    if( this.f(e) )
                        Mojo.Controller.errorDialog(e.join("... "));
                }

            } else {
                Mojo.Log.info("AccountManager::login() sent [kinda bad]: transport=%s", Object.toJSON(transport));
                var e = ["Unknown error issuing hiveminder login -- host not found?"];

                if( this.f(e) )
                    Mojo.Controller.errorDialog(e.join("... "));
            }

        }.bind(this),

        onFailure: function(transport) {
            var t = new Template($L("Ajax Error: #{status}"));
            var m = t.evaluate(transport);
            var e = [m];

            if( this.f(e) )
                Mojo.Controller.errorDialog(e.join("... "));

        }.bind(this)

    });
}

