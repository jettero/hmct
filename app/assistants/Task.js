/*jslint white: false, onevar: false
*/
/*global Mojo $ Template palmGetResource
*/

function TaskAssistant(_i) {
    Mojo.Log.info("Task(%s)", (this.task = _i).record_locator);

    this.handleTaskChange = this.handleTaskChange.bind(this);
}

// Templates and Resources {{{
TaskAssistant.prototype.shortTemplate = new Template(palmGetResource(Mojo.appPath + "app/views/tt/task-short.html"));
TaskAssistant.prototype.longTemplate  = new Template(palmGetResource(Mojo.appPath + "app/views/tt/task-long.html"));

TaskAssistant.prototype.commentsHTML = palmGetResource(Mojo.appPath + "app/views/tt/task-comments.html");
TaskAssistant.prototype.historyHTML  = palmGetResource(Mojo.appPath + "app/views/tt/task-history.html");
// }}}

/* {{{ */ TaskAssistant.prototype.setup = function() {
    Mojo.Log.info("Task::setup()");

    // comments list // -------------------------------------------------

    this.commentsListAttrs = {
        listTemplate:    'misc/naked-list-container',
        emptyTemplate:   'misc/empty-list',
        itemTemplate:    'tt/task-comment',
        swipeToDelete:   false
    };

    this.commentsListModel = {listTitle: 'Task Comments', choices: [], items: [{message: "grrz"}]};
    this.controller.setupWidget('hm_task_comments', this.commentsListAttrs, this.commentsListModel);
    // this.commentsListWidget = new Mojo.Controller.WidgetController( this.controller.get("hm_task_comments"), this.controller, this.commentsListModel);

    // task list // -------------------------------------------------

    this.taskListAttrs = {
        dividerFunction: function(mi) { return mi.category; },
        dividerTemplate: 'misc/li-generic-div',
        listTemplate:    'misc/naked-list-container',
        emptyTemplate:   'misc/empty-list',
        itemTemplate:    'misc/li-generic-row',
        swipeToDelete:   false
    };

    var items = [
        { id: "desc", category: "task",     row_html: "<div id='task-snl'></div>" },
        { id: "talk", category: "comments", row_html: this.commentsHTML },
        { id: "hist", category: "history",  /* row_html: this.historyHTML*/ }
    ];

    this.taskListModel = {listTitle: 'Hiveminder Task', items: items };
    this.controller.setupWidget('hm_task_list', this.taskListAttrs, this.taskListModel);

    // misc

    this.controller.get("id").update(this.task.record_locator);
    this.firstActivation = true;

    Mojo.Log.info("Task::setup() [complete]");
};

/*}}}*/
/* {{{ */ TaskAssistant.prototype.handleTaskChange = function(task) {
    Mojo.Log.info("Task::handleTaskChange(%s)", task.record_locator);

    this.task = task; // This is probably always the same exact task over and over?
                     // The assignment shouldn't cost much.

    this.controller.get("task-snl").update(
        this.shortTemplate.evaluate(task) + this.longTemplate.evaluate(task)
    );

    /*
    this.commentsListModel.items = [
        {message: "test1"},
        {message: "test2"},
        {message: "test3"}
    ];

    this.controller.modelChanged(this.commentsListModel);
    */
};

/*}}}*/

/* {{{ */ TaskAssistant.prototype.activate = function() {
    Mojo.Log.info("Task::activate()");

    if( this.firstActivation ) {
        this.startCompressor("task");
        this.startCompressor("comments");
        this.startCompressor("history");

        // force a click on task info
        // this.clickCollapsibleList( this.controller.get('compressible' + "task"), "task" );
           this.clickCollapsibleList( this.controller.get('compressible' + "comments"), "comments" );

        this.firstActivation = false;
    }

    TMO.registerTaskChange(this.handleTaskChange, this.task);
};

/*}}}*/
/* {{{ */ TaskAssistant.prototype.deactivate = function() {
    Mojo.Log.info("Task::deactivate()");

    TMO.unregisterTaskChange(this.handleTaskChange, this.task);
};

/*}}}*/

/* {{{ */ TaskAssistant.prototype.startCompressor = function(category) {
    Mojo.Log.info("Task::startCompressor(%s)", category);

    var compressible = this.controller.get('compressible' + category);
    var compress     = this.controller.get('compress'     + category);

    compress.addClassName('compressor');
    compress.compressorID = category;

    var me = this;
    this.controller.listen(compress, Mojo.Event.tap, function(e) {
        Mojo.Log.info("Task::startCompressor() lambda:[tap event for: %s]", category);
        me.clickCollapsibleList(compressible, category); });

    this.moveElementIntoDividers(category);
    compressible.hide();
};

/*}}}*/
/* {{{ */ TaskAssistant.prototype.moveElementIntoDividers = function(category) {
    Mojo.Log.info("Task::moveElementIntoDividers(category: %s)", category);

    var compressible = this.controller.get('compressible' + category);

    var me = this;
    this.taskListModel.items.findAll(function(item){ return item.category === category; }).each(function(item){
        compressible.insert( me.controller.get('element-' + item.id) );
    });
};

/*}}}*/
/* {{{ */ TaskAssistant.prototype.clickCollapsibleList = function(compressible, category) {
    Mojo.Log.info("Task::clickCollapsibleList()");

    var targetRow = this.controller.get(category + "-sit");

    if (targetRow) {
        compressible.show(); // show immediately or getHeight() is mysteriously off by 76px ...

        var toggleButton    = targetRow.down("div.arrow_button");
        var showContents    = toggleButton.hasClassName('palm-arrow-closed');
        var maxHeight       = compressible.getHeight();

        var options = {
            curve:      'over-easy',
            from:       1,
            to:         maxHeight,
            duration:   0.4
        };

        if (showContents) {
            toggleButton.addClassName('palm-arrow-expanded');
            toggleButton.removeClassName('palm-arrow-closed');
            compressible.setStyle({ height: '1px' });

            options.onComplete = function(e) {
                compressible.setStyle({height: 'auto'});
            };

        } else {
            toggleButton.addClassName('palm-arrow-closed');
            toggleButton.removeClassName('palm-arrow-expanded');

            compressible.setStyle({ height: maxHeight + 'px' });

            options.reverse    = true;
            options.onComplete = function(e) {
                compressible.setStyle({height: 'auto'});
                compressible.hide();
            };
        }

        Mojo.Animation.animateStyle(compressible, 'height', 'bezier', options);
    }
};

/*}}}*/
