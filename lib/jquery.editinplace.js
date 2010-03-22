/*

Another In Place Editor - a jQuery edit in place plugin

Copyright (c) 2009 Dave Hauenstein

Authors:
	Dave Hauenstein
	Martin Häcker <spamfaenger [at] gmx [dot] de>

License:
This source file is subject to the BSD license bundled with this package.
Available online: {@link http://www.opensource.org/licenses/bsd-license.php}
If you did not receive a copy of the license, and are unable to obtain it,
email davehauenstein@gmail.com, and I will send you a copy.

Project home:
http://code.google.com/p/jquery-in-place-editor/

Version 1.0.2

TODO: 
- Support overriding individual options with the metadata plugin
- expand the interface to submit to functions to make it easier to integrate into custom applications
  (fold in show progress, offer callbacks for different lifecycle events, ...)
- support live events to trigger inline editing to ease highly dynamic websites better

REFACT:
- include spinner image as data url into javascript
- support an array of options for select_options
- rename callbackShowErrors to callback_show_errors for consistency
- consider to extract the inline error function

*/

(function($){

$.fn.editInPlace = function(options) {
	
	var settings = $.extend({}, $.fn.editInPlace.defaults, options);
	
	preloadImage(settings.saving_image);
	
	return this.each(function() {
		// TODO: should prevent setting an inline editor twice on one selector - especially with the same options
		new InlineEditor(settings, $(this)).init();
	});
};

/// Switch these through the dictionary argument to $(aSelector).editInPlace(overideOptions)
$.fn.editInPlace.defaults = {
	url:				"", // string: POST URL to send edited content
	bg_over:			"#ffc", // string: background color of hover of unactivated editor
	bg_out:				"transparent", // string: background color on restore from hover
	show_buttons:		false, // boolean: will show the buttons: cancel or save; will automatically cancel out the onBlur functionality
	save_button:		'<button class="inplace_save">Save</button>', // string: image button tag to use as “Save” button
	cancel_button:		'<button class="inplace_cancel">Cancel</button>', // string: image button tag to use as “Cancel” button
	params:				"", // string: example: first_name=dave&last_name=hauenstein extra paramters sent via the post request to the server
	field_type:			"text", // string: "text", "textarea", or "select";  The type of form field that will appear on instantiation
	default_text:		"(Click here to add text)", // string: text to show up if the element that has this functionality is empty
	textarea_rows:		10, // integer: set rows attribute of textarea, if field_type is set to textarea
	textarea_cols:		25, // integer: set cols attribute of textarea, if field_type is set to textarea
	select_text:		"Choose new value", // string: default text to show up in select box
	select_options:		"", // string: comma delimited list of options if field_type is set to select. Example: "text1:value1, text2:value2, ..."
	saving_text:		"Saving...", // string: text to be used when server is saving information
	saving_image:		"", // string: uses saving text specify an image location instead of text while server is saving
	value_required:		false, // boolean: if set to true, the element will not be saved unless a value is entered
	element_id:			"element_id", // string: name of parameter holding the id or the editable
	update_value:		"update_value", // string: name of parameter holding the updated/edited value
	original_html:		"original_html", // string: name of parameter holding original_html value of the editable
	on_blur:			"save", // string: "save" or null; what to do on blur; will be overridden if show_buttons is true
	callback:			null, // function: function to be called when editing is complete; cancels ajax submission to the url param
	callbackShowErrors: true, // boolean: if errors should be shown as alerts when submitting to a callback
	success:			null, // function: this function gets called if server responds with a success
	error:				function(request){ // function: this function gets called if server responds with an error
							alert("Failed to save value: " + request.responseText || 'Unspecified Error');
                        }
};


function InlineEditor(settings, dom) {
	this.settings = settings;
	this.dom = dom;
};
$.fn.editInPlace.InlineEditor = InlineEditor;

$.extend(InlineEditor.prototype, {
	init: function() {
		if('' === this.dom.html())
		 	this.dom.html(this.settings.default_text);
		
		var settings = this.settings;
		this.dom
			.hover(
				function(){ $(this).css("background", settings.bg_over); },
				function(){ $(this).css("background", settings.bg_out); })
			.click(this.replaceContentWithEditor(this.settings, this.dom));
	},
	
	createEditorElement: function() {
		// REFACT: need to put the stuff into the dom via val() or text() or the escaping will not be right
		var nameAndClass = ' name="inplace_value" class="inplace_field" ';
		
		// if html is our default text, clear it out to prevent saving accidentally
		// REFACT: clearing should only happen if the element was actually filled with the default text earlier
		if (this.originalHTML === this.settings.default_text) this.dom.html('');
		
		// REFACT: this should be saved on initialization time so we don't have to re-get it 
		// then its just neccessary to make sure it's reinitialized when the editor is activated again
		var initialContent = trim(this.dom.text());
		
		if ("text" === this.settings.field_type) {
			var editor = $('<input type="text"' + nameAndClass + '/>');
			editor.val(initialContent);
			return editor;
		}
		else if ("textarea" === this.settings.field_type) {
			var editor = $('<textarea' + nameAndClass + 'rows="' + this.settings.textarea_rows + '" cols="' + this.settings.textarea_cols + '"></textarea>');
			editor.val(initialContent);
			return editor;
		}
		else if ("select" === this.settings.field_type) {
			// REFACT: consider to make this 'documentation choice' a non selectable value so it can't be submitted by accident
			var editor = $('<select' + nameAndClass + '><option value="">' + this.settings.select_text + '</option></select>');
			var optionsArray = this.settings.select_options.split(',');
			for (var i=0; i<optionsArray.length; i++){
				var textAndValue = optionsArray[i].split(':');
				var value = textAndValue[1] || textAndValue[0];
				var text = textAndValue[0];
				var selected = (value == this.originalHTML) ? 'selected="selected" ' : '';
				var option = $('<option ' + selected + ' ></option>').val(trim(value)).text(trim(text));
				editor.append(option);
			}
			return editor;
		}
	},
	
	// REFACT: use this.settings instead of settings
	replaceContentWithEditor: function(settings) {
		var editing = false;
		this.originalHTML = null;
		var dom = this.dom;
		var that = this;
		
		return function(){
			// prevent re-adding the editor when it is already open
			if (editing)
				return;
			editing = true;
			
			//save original text - for cancellation functionality
			that.originalHTML = dom.html();
			replaceWithEditor();
			hookUpEvents();
			
			function replaceWithEditor() {
				var buttons_html  = (settings.show_buttons) ? settings.save_button + ' ' + settings.cancel_button : '';
				var editorElement = that.createEditorElement(); // needs to happen before anything is replaced
				/* insert the new in place form after the element they click, then empty out the original element */
				dom.html('<form class="inplace_form" style="display: inline; margin: 0; padding: 0;"></form>')
					.find('form')
						.append(editorElement)
						.append(buttons_html);
			}

			function hookUpEvents() {
				dom.children("form").children(".inplace_field").focus().select();
				dom.children("form").children(".inplace_cancel").click(cancelAction);
				dom.children("form").children(".inplace_save").click(saveAction);
				if ( ! settings.show_buttons) {
					if ("save" === settings.on_blur)
						// TODO: Firefox has a bug where blur is not reliably called when focus is lost (for example by another editor appearing)
						dom.children("form").children(".inplace_field").blur(saveAction);
					else
						dom.children("form").children(".inplace_field").blur(cancelAction);
				}

				// REFACT: should only cancel while the focus is inside the element
				$(document).keyup(function(event){
					if (event.keyCode == 27) { // escape key
						cancelAction();
					}
				});

				dom.children("form").submit(saveAction);
			}

			function cancelAction() {
				editing = false;
				dom.css("background", settings.bg_out);
				dom.html(that.originalHTML);
				return false;
			}

			function saveAction() {
				dom.css("background", settings.bg_out);
				var this_elem = $(this);
				var new_html = (this_elem.is('form')) ? this_elem.children(0).val() : this_elem.parent().children(0).val();

				/* set saving message */
				if("" !== settings.saving_image)
					var saving_message = '<img src="' + settings.saving_image + '" alt="Saving..." />';
				else
					var saving_message = settings.saving_text;
				dom.html(saving_message);

				if ("" !== settings.params)
					settings.params = "&" + settings.params;

				if (settings.callback) {
					html = settings.callback(dom.attr("id"), new_html, that.originalHTML, settings.params);
					editing = false;
					if (html)
						dom.html(html);
					else {
						/* failure; put original back */
						if (settings.callbackShowErrors) {
							// REFACT: This should be overridable in the settings object
							alert("Failed to save value: " + new_html);
						}
						dom.html(that.originalHTML);
					}
				} else if (settings.value_required && (new_html == "" || new_html == undefined)) {
					editing = false;
					dom.html(that.originalHTML);
					// REFACT: This should be overridable in the settings object
					alert("Error: You must enter a value to save this field");
				} else {
					$.ajax({
						url: settings.url,
						type: "POST",
						data: settings.update_value + '=' + new_html + '&' + settings.element_id + '=' + dom.attr("id") + settings.params + '&' + settings.original_html + '=' + that.originalHTML,
						dataType: "html",
						complete: function(request){
							editing = false;
						},
						success: function(html){
							/* if the text returned by the server is empty, */
	 								/* put a marker as text in the original element */
							var new_text = html || settings.default_text;

							/* put the newly updated info into the original element */
							dom.html(new_text);
							if (settings.success) settings.success(html, dom);
						},
						error: function(request) {
							dom.html(that.originalHTML);
							if (settings.error) settings.error(request, dom);
						}
					});
				}

				return false;
			}
		};
	}
});



// Private helpers .......................................................

/* preload the loading icon if it is configured */
function preloadImage(anImageURL) {
	if ('' === anImageURL)
		return;
	
	var loading_image = new Image();
	loading_image.src = anImageURL;
}

function trim(aString) {
	return aString
		// trim
		.replace(/^\s+/, '')
		.replace(/\s+$/, '');
}

})(jQuery);