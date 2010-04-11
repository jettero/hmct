/*jslint white: false, onevar: false
*/
/*global Mojo $ Template palmGetResource
*/

function TaskAssistant(_i) {
    Mojo.Log.info("Task(%s)", (this.task = _i).record_locator);

    this.SCa = Mojo.Controller.stageController.assistant;

    this.handleTaskChange = this.handleTaskChange.bind(this);
    this.menuSetup        = this.SCa.menuSetup.bind(this);
}

// Templates and Resources {{{
TaskAssistant.prototype.shortTemplate = new Template(palmGetResource(Mojo.appPath + "app/views/tt/task-short.html"));
TaskAssistant.prototype.longTemplate  = new Template(palmGetResource(Mojo.appPath + "app/views/tt/task-long.html"));
// }}}

/* {{{ */ TaskAssistant.prototype.setup = function() {
    Mojo.Log.info("Task::setup()");

    this.menuSetup();

    this.refreshModel     = { label: "Reload", icon: 'refresh', command: 'refresh' };
    this.commandMenuModel = { label: 'Task Command Menu', items: [ this.refreshModel ] };

	this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.commandMenuModel);

    // comments list // -------------------------------------------------

    this.historyListAttrs = {
        listTemplate:  'misc/naked-list-container',
        emptyTemplate: 'misc/empty-list',
        itemTemplate:  'tt/task-delta',
        swipeToDelete: false
    };

    this.historyListModel = {listTitle: 'Task History', items: []};
    this.controller.setupWidget('hm_task_history', this.historyListAttrs, this.historyListModel);

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


    this.historyListModel.items = task.comments ? task.comments : [];
    this.controller.modelChanged(this.historyListModel);
};

/*}}}*/

/* {{{ */ TaskAssistant.prototype.activate = function() {
    Mojo.Log.info("Task::activate()");

    if( this.firstActivation ) {
        this.startCompressor("task");
        this.startCompressor("history");

        // force a click on some of the compressors:

        for(var i=0; i<OPT.unfoldTaskCompressors.length; i++)
           this.clickCollapsibleList( this.controller.get('compressible-' + OPT.unfoldTaskCompressors[i]),
               OPT.unfoldTaskCompressors[i] );

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

    var compressible = this.controller.get('compressible-' + category);
    var compress     = this.controller.get('compress-'     + category);

    compress.addClassName('compressor');
    compress.compressorID = category;

    var me = this;
    this.controller.listen(compress, Mojo.Event.tap, function(e) {
        Mojo.Log.info("Task::startCompressor() lambda:[tap event for: %s]", category);
        me.clickCollapsibleList(compressible, category); });

    compressible.hide();
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
