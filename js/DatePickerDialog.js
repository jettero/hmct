/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/

function DatePickerDialogAssistant(_sa,_mn) {
    Mojo.Log.info("DatePicker()");

    this.scene = _sa;
    this.model = _sa[_mn];
}

DatePickerDialogAssistant.prototype.activate = function() {
    Mojo.Log.info("DatePicker::activate()");

    this._datePicker = jQuery('#date-picker').datepicker({ inline: true });
    this._datePicker.datepicker('setDate', this.model.value);
};


