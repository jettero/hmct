/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo Template
*/

function ConfrimationDialog(launcher) {
    this.logTemplate = new Template(launcher + "#{fname}() [#{desc}]: #{message}");
    this.showRetry = this.showRetry.bind(this);
}

ConfrimationDialog.prototype.showRetry = function(fname,desc,message,cb) {
    var o = {desc: desc, message: message};

    if( fname ) o.fname = "::" + fname;
    else        o.fname = "";

    Mojo.Log.info( this.logTemplate.evaluate(o) );

    return Mojo.Controller.stageController.topScene().showAlertDialog({
		onChoose: function(value) {try{cb(value);}catch(e){}},
		title:    'Really?',
		message:  message,
		choices: [
            {label:'Yes',  value:'yes', type:'affirmative'},
            {label:'No',   value:'no',  type:'negative'},
        ]
	});
};
