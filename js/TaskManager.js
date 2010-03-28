/*jslint white: false, onevar: false
*/
/*global Mojo AMO REQ Template OPT setTimeout
*/

/* {{{ */ function TaskManager() {
    Mojo.Log.info("TaskManager()");

    this.handleLoginChange = this.handleLoginChange.bind(this);

    AMO.registerLoginChange(this.handleLoginChange);

    this.tasksChangeCallback = [];
    this.defaultSearch = "accepted but first nothing not complete due before 7 days from now hidden until before tomorrow not hidden forever";

    this.cardLoaded(false);
}

/*}}}*/
/* {{{ */ TaskManager.prototype.handleLoginChange = function(emails,current) {
    Mojo.Log.info("TaskManager::handleLoginChange(current=%s)", current);

    this.currentLogin = current;

    if( current )
        this.searchTasks();

};

/*}}}*/
/* {{{ */ TaskManager.prototype.activate = function() {
    this.searchTasks();
};

/*}}}*/
/* {{{ */ TaskManager.prototype.processTasks = function() {
    Mojo.Log.info("TaskManager::processTasks()");

    this.notifyTasksChange();
};

/*}}}*/
/* {{{ */ TaskManager.prototype.searchTasks = function(search,force) {
    if( !search ) {
        if( !this.lastSearch ) {
            search = this.defaultSearch;

        } else {
            search = this.lastSearch;
        }
    }

    Mojo.Log.info("TaskManager::searchTasks(%s,[%s])", search, force ? "force" : "cache ok");

    var current_login  = this.currentLogin;
    var search_key     = hex_md5(current_login + "@@" + search);
    var me             = this;

    if( !this.cardLoaded() ) {
        setTimeout(function(){ me.searchTasks(search,force); }, 500);
        return;
    }

    if( this.dbBusy() ) {
        setTimeout(function(){ me.searchTasks(search,force); }, 500);
        return;
    }

    // TODO: use the caching!!

    // AjaxDRY(desc,url,method,params,success,failure);

    this._ajax_dry = new AjaxDRY("TaskManager::searchTasks()", 'http://hiveminder.com/=/action/DownloadTasks.json',
        'post', {format: "json", query: search.replace(/\s+/g, "/")},

        function(r) {

            if( r.success ) {
                Mojo.Log.info("TaskManager::searchTasks()::onSuccess() r.content.result=%s", r.content.result);

                me.setCache(search_key, (me.tasks = me.fixutf8( r.content.result ).evalJSON()) );
                me.processTasks();

            } else {
                Mojo.Log.info("TaskManager::searchTasks()::onSuccess() r.fail, r=%s", Object.toJSON(r));

                var e = [];

                if( r.error )
                    e.push(r.error);

                for(var k in r.field_errors )
                    e.push(k + "-error: " + r.field_errors[k]);

                if( !e.length )
                    e.push("Something went wrong with the task search ...");

                Mojo.Controller.errorDialog(e.join("... "));
            }

            return false;
        }
    });
};

/*}}}*/

/* {{{ */ TaskManager.prototype.cardLoaded = function(arg) {

    if( arg != null ) // neither null nor undefined
        this._cardLoaded = arg;

    Mojo.Log.info("TaskManager::cardLoaded(%s) [%s]", arg, this._cardLoaded);

    return this._cardLoaded;
};

/*}}}*/

/* {{{ */ TaskManager.prototype.registerTasksChange = function(callback) {
    Mojo.Log.info("TaskManager::registerTasksChange()");

    this.tasksChangeCallback.push(callback);
    this.notifyTasksChangeStep(callback);
};

/*}}}*/
/* {{{ */ TaskManager.prototype.unregisterTasksChange = function(callback) {
    Mojo.Log.info("AccountManager::unregisterTasksChange()");

    this.tasksChangeCallback = this.tasksChangeCallback.reject(function(_c){ return _c === callback; });
};

/*}}}*/
/* {{{ */ TaskManager.prototype.notifyTasksChangeStep = function(callback) {
    Mojo.Log.info("TaskManager::notifyTasksChangeStep() this.tasks=%s", Object.toJSON(this.tasks));

    var tasks = [];

    // r={"success": 1, "content": {"result":
    // "[{\"priority\":3,\"record_locator\":\"xxxx\",\"time_worked\":null,\"attachment_count\":0,\"repeat_period\":
    // \"once\",\"group\":null,\"summary\":\"test task 2 (due
    // today)\",\"time_left\":null,\"id\":xxxxx,\"repeat_every\":1,\"owner\":\"Paul

    if( this.tasks )
        for(var i=0; i<this.tasks.length; i++)
            tasks.push( Object.clone(this.tasks[i]) ); // shallow copy, but this should be good enough

    callback(tasks);
};

/*}}}*/
/* {{{ */ TaskManager.prototype.notifyTasksChange = function() {
    Mojo.Log.info("AccountManager::notifyTasksChange()");

    for( var i=0; i<this.tasksChangeCallback.length; i++ )
        this.notifyTasksChangeStep(this.tasksChangeCallback[i]);
};

/*}}}*/

/* {{{ */ TaskManager.prototype.fixutf8 = function (utftext) { // stolen from: http://www.webtoolkit.info/javascript-utf8.html
    var str = "";
    var i = 0;
    var c,c1,c2,c3;

    while( i<utftext.length ) {

        c = utftext.charCodeAt(i);

        if (c < 128) {
            str += String.fromCharCode(c);
            i++;

        } else if((c > 191) && (c < 224)) {
            c2 = utftext.charCodeAt(i+1);
            str += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
            i += 2;

        } else {
            c2 = utftext.charCodeAt(i+1);
            c3 = utftext.charCodeAt(i+2);
            str += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            i += 3;
        }

    }

    return str;
};

/*}}}*/

Mojo.Log.info('loaded(TaskManager.js)');
