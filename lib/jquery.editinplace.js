/*
 * Another In Place Editor - a jQuery edit in place plugin
 *
 * Copyright (c) 2009 Dave Hauenstein
 *
 * License:
 * This source file is subject to the BSD license bundled with this package.
 * Available online: {@link http://www.opensource.org/licenses/bsd-license.php}
 * If you did not receive a copy of the license, and are unable to obtain it,
 * email davehauenstein@gmail.com, and I will send you a copy.
 *
 * Project home:
 * http://code.google.com/p/jquery-in-place-editor/
 *
 * Version 1.0.2
 * 
 */

jQuery.fn.editInPlace = function(options) {

	/* DEFINE THE DEFAULT SETTINGS, SWITCH THEM WITH THE OPTIONS USER PROVIDES */
	// TODO: expose default settings
	// TODO: Support setting stuff via metadata plugin
	// REFACT: include spinner image as data url into javascript
	// REFACT: support an array of options for select_options
	// REFACT: rename callbackShowErrors to callback_show_errors for consistency
	// TODO: expand the interface to submit to functions to make it easier to integrate into custom applications (fold in show progress, offer callbacks for different lifecycle events, ...)
	// REFACT: consider to extract the inline error function
	var settings = {
		url:				"", // string: POST URL to send edited content
		bg_over:			"#ffc", // string: background color of hover of unactivated editor
		bg_out:				"transparent", // string: background color on restore from hover
		show_buttons:		false, // boolean: will show the buttons: cancel or save; will automatically cancel out the onBlur functionality
		save_button:		'<button class="inplace_save">Save</button>', // string: image button tag to use as “Save” button
		cancel_button:		'<button class="inplace_cancel">Cancel</button>', // string: image button tag to use as “Cancel” button
		params:				"", // string: example: first_name=dave&last_name=hauenstein extra paramters sent via the post request to the server
		field_type:			"text", // string: "text", "textarea", or "select";  The type of form field that will appear on instantiation
		select_options:		"", // string: comma delimited list of options if field_type is set to select
		textarea_cols:		25, // integer: set cols attribute of textarea, if field_type is set to textarea
		textarea_rows:		10, // integer: set rows attribute of textarea, if field_type is set to textarea
		saving_text:		"Saving...", // string: text to be used when server is saving information
		saving_image:		"", // string: uses saving text specify an image location instead of text while server is saving
		default_text:		"(Click here to add text)", // string: text to show up if the element that has this functionality is empty
		select_text:		"Choose new value", // string: default text to show up in select box
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

	if(options) {
		jQuery.extend(settings, options);
	}

	/* preload the loading icon if it exists */
	if(settings.saving_image != ""){
		var loading_image = new Image();
		loading_image.src = settings.saving_image;
	}

	/* THIS FUNCTION WILL TRIM WHITESPACE FROM BEFORE/AFTER A STRING */
	String.prototype.trim = function() {
		return this.replace(/^\s+/, '')
							 .replace(/\s+$/, '');
	};

	/* THIS FUNCTION WILL ESCAPE ANY HTML ENTITIES SO "Quoted Values" work */
	String.prototype.escape_html = function() {
		return this.replace(/&/g, "&amp;")
							 .replace(/</g, "&lt;")
							 .replace(/>/g, "&gt;")
							 .replace(/"/g, "&quot;");
  };

	/* CREATE THE INPLACE EDITOR */
	return this.each(function(){

		if(jQuery(this).html() == "") jQuery(this).html(settings.default_text);

		var editing = false;

		//save the original element - for change of scope
		var original_element = jQuery(this);

		var click_count = 0;

		jQuery(this)

		.mouseover(function(){
			jQuery(this).css("background", settings.bg_over);
		})

		.mouseout(function(){
			jQuery(this).css("background", settings.bg_out);
		})

		.click(function(){
			click_count++;

			if(!editing)
			{
				editing = true;

				//save original text - for cancellation functionality
				var original_html = jQuery(this).html();
				var buttons_code  = (settings.show_buttons) ? settings.save_button + ' ' + settings.cancel_button : '';

				//if html is our default text, clear it out to prevent saving accidentally
				if (original_html == settings.default_text) jQuery(this).html('');

				if (settings.field_type == "textarea")
				{
					var use_field_type = '<textarea name="inplace_value" class="inplace_field" rows="' + settings.textarea_rows + '" cols="' + settings.textarea_cols + '">' + jQuery(this).text().trim().escape_html() + '</textarea>';
				}
				else if(settings.field_type == "text")
				{
					var use_field_type = '<input type="text" name="inplace_value" class="inplace_field" value="' +
											jQuery(this).text().trim().escape_html() + '" />';
				}
				else if(settings.field_type == "select")
				{
					var optionsArray = settings.select_options.split(',');
					var use_field_type = '<select name="inplace_value" class="inplace_field"><option value="">' + settings.select_text + '</option>';
						for(var i=0; i<optionsArray.length; i++){
							var optionsValuesArray = optionsArray[i].split(':');
							var use_value = optionsValuesArray[1] || optionsValuesArray[0];
							var selected = use_value == original_html ? 'selected="selected" ' : '';
							use_field_type += '<option ' + selected + 'value="' + use_value.trim().escape_html() + '">' + optionsValuesArray[0].trim().escape_html() + '</option>';
                        }
						use_field_type += '</select>';
				}

				/* insert the new in place form after the element they click, then empty out the original element */
				jQuery(this).html('<form class="inplace_form" style="display: inline; margin: 0; padding: 0;">' + use_field_type + ' ' + buttons_code + '</form>');

			}/* END- if(!editing) -END */

			if(click_count == 1)
			{
				function cancelAction()
				{
					editing = false;
					click_count = 0;

					/* put the original background color in */
					original_element.css("background", settings.bg_out);

					/* put back the original text */
					original_element.html(original_html);

					return false;
				}

				function saveAction()
				{
					/* put the original background color in */
					original_element.css("background", settings.bg_out);

                    var this_elem = jQuery(this);

					var new_html = (this_elem.is('form')) ? this_elem.children(0).val() : this_elem.parent().children(0).val();

					/* set saving message */
					if(settings.saving_image != ""){
						var saving_message = '<img src="' + settings.saving_image + '" alt="Saving..." />';
					} else {
						var saving_message = settings.saving_text;
					}

					/* place the saving text/image in the original element */
					original_element.html(saving_message);

					if(settings.params != ""){
						settings.params = "&" + settings.params;
					}

					if(settings.callback) {
						html = settings.callback(original_element.attr("id"), new_html, original_html, settings.params);
						editing = false;
						click_count = 0;
						if (html) {
							/* put the newly updated info into the original element */
							original_element.html(html || new_html);
						} else {
							/* failure; put original back */
							if(settings.callbackShowErrors)
							{
							    alert("Failed to save value: " + new_html);
							}
							original_element.html(original_html);
						}
					} else if (settings.value_required && (new_html == "" || new_html == undefined)) {
						editing = false;
						click_count = 0;
						original_element.html(original_html);
						alert("Error: You must enter a value to save this field");
					} else {
						jQuery.ajax({
							url: settings.url,
							type: "POST",
							data: settings.update_value + '=' + new_html + '&' + settings.element_id + '=' + original_element.attr("id") + settings.params + '&' + settings.original_html + '=' + original_html,
							dataType: "html",
							complete: function(request){
								editing = false;
								click_count = 0;
							},
							success: function(html){
								/* if the text returned by the server is empty, */
   								/* put a marker as text in the original element */
								var new_text = html || settings.default_text;

								/* put the newly updated info into the original element */
								original_element.html(new_text);
								if (settings.success) settings.success(html, original_element);
							},
							error: function(request) {
								original_element.html(original_html);
								if (settings.error) settings.error(request, original_element);
							}
						});
					}

					return false;
				}

				/* set the focus to the new input element */
				original_element.children("form").children(".inplace_field").focus().select();

				/* CLICK CANCEL BUTTON functionality */
				original_element.children("form").children(".inplace_cancel").click(cancelAction);

				/* CLICK SAVE BUTTON functionality */
				original_element.children("form").children(".inplace_save").click(saveAction);

                /* if cancel/save buttons should be shown, cancel blur functionality */
                if(!settings.show_buttons){
                    /* if on_blur is set to save, set the save funcion */
    				if(settings.on_blur == "save")
    					original_element.children("form").children(".inplace_field").blur(saveAction);
    				/* if on_blur is set to cancel, set the cancel funcion */
    				else
    					original_element.children("form").children(".inplace_field").blur(cancelAction);
                }

				/* hit esc key */
				$(document).keyup(function(event){
				    if (event.keyCode == 27) {
						cancelAction();
				    }
				});

                original_element.children("form").submit(saveAction);

			}/* END- if(click_count == 1) -END */
		});
	});
};