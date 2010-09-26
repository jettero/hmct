/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo Template
*/

function SuccessDialog(launcher) {
    this.logTemplate = new Template(launcher + "#{fname}() [#{desc}]: #{message}");
    this.showSuccess = this.showSuccess.bind(this);
}

SuccessDialog.prototype.showSuccess = function(fname,desc,message,cb) {
    var o = {desc: desc, message: message};

    if( fname ) o.fname = "::" + fname;
    else        o.fname = "";

    Mojo.Log.info( this.logTemplate.evaluate(o) );
    Mojo.Controller.stageController.topScene().showAlertDialog({
		onChoose: function(value) {try{cb(value)}catch(e){}},
		title:    'Success',
		message:  message,
		choices: [ {label:'OK', value:'OK', type:'color'} ]
	});
};
