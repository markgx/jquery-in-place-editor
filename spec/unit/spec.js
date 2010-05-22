
describe 'jquery.editinplace'
  before
    // REFACT: use JSpec.context = { foo : 'bar' } for this
    // helpers to simplify writing the tests
    this.enableEditor = function(options) {
      // need either callback or url or the inline editor will throw
      if ( ! options || ! ('callback' in options))
        options = $.extend({url:'nonexistant_url'}, options);
      return this.sandbox.editInPlace(options);
    }
    
    this.openEditor = function(options) {
      return this.enableEditor(options).click().find(':input');
    }
    
    this.edit = function(options, value) {
      value = (undefined === value) ? 'text that is different to what was entered before' : value;
      this.openEditor(options).val(value).submit();
      return this.sandbox;
    }
    
  end
  
  before_each
    // If this is missing each request will grab the current page (no url specified)
    // and on inserting it, that will whipe the test results. (I don't quite understand why)
    mock_request().and_return('fnord')
    
    // REFACT: use JSpec.context = { foo : 'bar' } for this
    this.sandbox = $('<p>Some text</p>')
    // Workaround to jquery-ui 1.7.3 bug that it can't reliably deal with document fragments not having a color at their root element
    this.sandbox.parent().css({ backgroundColor:'transparent' })
  end
  
  describe 'default settings'
    it 'should throw if neither url nor callback option is set'
      var that = this;
      -{ that.sandbox.editInPlace() }.should.throw_error Error, "Need to set either url: or callback: option for the inline editor to work."
    end
    
    it 'can convert tag to editor'
      this.openEditor()
      this.sandbox.should.have_tag 'input'
    end
    
    it 'leaves out buttons by default'
      this.openEditor()
      this.sandbox.should.not.have_tags 'button'
    end
    
    it 'uses text as default field type'
      this.openEditor()
      this.sandbox.should.have_tag 'input[type="text"]'
    end
    
    it 'will hover to yellow'
      this.enableEditor().mouseover().css('background-color').should.equal 'rgb(255, 255, 204)'
      this.sandbox.mouseout().css('background-color').should.equal 'transparent'
    end
    
    it 'should show "click here to add text" if element is empty'
      this.sandbox = $('<p>');
      this.enableEditor().should.have_text "(Click here to add text)"
    end
    
    it 'will size textareas 25x10 by default'
      var textarea = this.openEditor({field_type:'textarea'})
      textarea.attr('cols').should.be 25
      textarea.attr('rows').should.be 10
    end
    
    describe 'ajax submissions'
      
      before_each
        var that = this;
        that.url = undefined;
        stub($, 'ajax').and_return(function(options){ that.url = options.data; })
      end
      
      it 'will submit id of original element as element_id'
        this.sandbox.attr('id', 'fnord')
        this.edit()
        this.url.should.include 'element_id=fnord'
      end
      
      it 'will submit content of editor as update_value'
        this.edit({}, 'fnord')
        this.url.should.include 'update_value=fnord'
      end
      
      it 'will submit original html with key original_html'
        this.sandbox.text('fnord')
        this.edit({}, 'foo')
        this.url.should.include 'original_html=fnord'
      end
      
      it 'will url encode entered text'
        this.edit({}, '%&=/<>')
        this.url.should.include 'update_value=%25%26%3D%2F%3C%3E'
      end
      
      it 'will url encode original html correctly'
        this.sandbox.html('<p onclick="\"%&=/<>\"">')
        this.edit({use_html:true})
        this.url.should.include 'original_html=%3Cp%20onclick%3D%22%22%20%25%26%3D%22%2F%26lt%3B%22%3E%22%22%26gt%3B%3C%2Fp%3E'
      end
      
      it 'should not loose the param option on the second submit'
        var editor = this.openEditor({params: 'foo=bar'});
        this.edit()
        this.url.should.include 'foo=bar'
        editor.click().find(':input').val(23).submit()
        this.url.should.include 'foo=bar'
      end
      
      it 'will submit on blur'
        $.should.receive 'ajax'
        this.openEditor().val('fnord').blur()
      end
      
    end
    
    it 'should not trigger submit if nothing was changed'
      $.should.not.receive 'ajax'
      this.openEditor().submit()
    end
    
    it 'should not think that it has placed the default text in the editor if its content is changed from somewhere else'
      this.sandbox = $('<p></p>')
      this.enableEditor().text('fnord')
      this.sandbox.click().find(':input').val().should.equal 'fnord'
    end
    
    describe 'editor value interaction should use .text() to'
      
      before_each
        this.sandbox.html('fno<span>rd</span>')
      end
      
      it 'extract value from editor by default'
        this.openEditor().val().should.be 'fnord'
      end
      
      it 'restore content after cancel'
        this.openEditor().submit()
        // cancel editor
        this.sandbox.should.have_event_handlers 'click'
        this.sandbox.should.not.have_tag 'span'
      end
      
      it 'send to callback as third argument'
        var thirdArgument
        var options = {callback: -{ thirdArgument = arguments[2]; return ''; }}
        this.edit(options)
        thirdArgument.should.equal 'fnord'
      end
      
      it 'restore editor DOM after failed callback call'
        this.edit({callback: -{}, error_sink: -{}})
        this.sandbox.should.not.have_tag 'span'
      end
      
      it 'send to server via ajax-request'
        var data
        stub($, 'ajax').and_return(function(options) { data = options.data; })
        this.edit()
        data.should.match /original_value=fnord/
      end
      
    end
    
  end
  
  describe 'marker classes'
    
    it 'should set .editInPlace-active when activating editor'
      this.sandbox.should.not.have_class '.editInPlace-active'
      this.enableEditor().click().should.have_class '.editInPlace-active'
    end
    
    it 'should remove .editInPlace-active when editor finished submitting'
      this.openEditor()
      this.sandbox.should.have_class '.editInPlace-active'
      this.sandbox.find(':input').val('fnord').submit()
      this.sandbox.should.not.have_class '.editInPlace-active'
    end
    
    it 'should remove .editInPlace-active when cancelling the editor'
      this.openEditor().submit();
      this.sandbox.should.not.have_class '.editInPlace-active'
    end
    
    it 'should remove .editInPlace-active when the callback returns if no animation callbacks are used'
      this.edit({ callback: -{ return ''; } }, 'bar')
      this.sandbox.should.not.have_class '.editInPlace-active'
    end
    
    it 'should not remove .editInPlace-active if didStartSaving() is called before callback returns'
      var callbacks;
      function callback(idOfEditor, enteredText, orinalHTMLContent, settingsParams, animationCallbacks) {
        callbacks = animationCallbacks;
        callbacks.didStartSaving();
        return '';
      }
      this.edit({ callback:callback })
      this.sandbox.should.have_class '.editInPlace-active'
      callbacks.didEndSaving();
      this.sandbox.should.not.have_class '.editInPlace-active'
    end
    
    it 'should ignore animation callbacks after submit callback has returned'
      var callbacks;
      function callback(idOfEditor, enteredText, orinalHTMLContent, settingsParams, animationCallbacks) {
        callbacks = animationCallbacks;
        return '';
      }
      this.edit({ callback: callback })
      this.sandbox.should.not.have_class '.editInPlace-active'
      
      -{ callbacks.didStartSaving() }.should.throw_error /Cannot call/
      -{ callbacks.didEndSaving() }.should.throw_error /Cannot call/
    end
    
    it 'throws if calling didEndSaving() in the callback before didStartSaving() was called'
      var callbacks;
      function callback(idOfEditor, enteredText, orinalHTMLContent, settingsParams, animationCallbacks) {
        -{ animationCallbacks.didEndSaving() }.should.throw_error /Cannot call/
        return '';
      }
      this.edit({ callback: callback })
    end
    
    it 'should allow to call both callbacks before the callback returns'
      function callback(idOfEditor, enteredText, orinalHTMLContent, settingsParams, animationCallbacks) {
        animationCallbacks.didStartSaving();
        animationCallbacks.didEndSaving();
        return '';
      }
      this.edit({ callback: callback })
      // now the editor should again be bound
      this.sandbox.should.not.have_tag 'form'
      this.sandbox.should.have_event_handlers 'click'
    end
    
  end
  
  describe 'animations during save'
    
    it 'should animate during ajax save to server'
      var complete
      stub($, 'ajax').and_return(function(options) { complete = options.complete; })
      this.edit()
      
      this.sandbox.is(':animated').should.be true
      complete();
      this.sandbox.is(':animated').should.be false
    end
    
    it 'should animate when callbacks are called when submitting to callback'
      var complete
      function callback(idOfEditor, enteredText, orinalHTMLContent, settingsParams, animationCallbacks) {
        animationCallbacks.didStartSaving();
        complete = animationCallbacks.didEndSaving;
        return '';
      }
      this.edit({ callback: callback })
      
      this.sandbox.is(':animated').should.be true
      complete();
      this.sandbox.is(':animated').should.be false
    end
    
    it 'should not animate if callbacks are not called when submitting to callback'
      this.edit({ callback: function() { return ''; }})
      this.sandbox.is(':animated').should.be false
    end
    
  end

  describe 'submit to callback'
    
    before
      // stub($, 'ajax') // don't want any submits to happen
    end
    
    it 'shoud call callback on submit'
      var sensor = false;
      this.edit({ callback: -{ sensor = true; return ''; }})
      sensor.should.be true
    end
    
    it 'will replace editor with its return value'
      this.edit({ callback: -{ return 'fnord' } })
      this.sandbox.should.have_text 'fnord'
    end
    
    it 'can return 0 from callback'
      this.edit({callback: -{ return 0; }})
      this.sandbox.should.have_text "0"
    end
    
    it 'can return empty string from callback'
      this.edit({callback: -{ return ''; }})
      this.sandbox.should.have_text ''
    end
    
  end
  
  describe 'custom settings'
    
    it 'will show text during saving to server'
      stub($, 'ajax')
      this.edit({saving_text: 'Saving...'})
      this.sandbox.should.have_text "Saving..."
    end
    
    it 'should add params as additional parameters to post-url'
      var url
      stub($, 'ajax').and_return(function(options) { url = options.data; })
      this.edit({ params: 'foo=bar'})
      url.should.include 'foo=bar'
    end
    
    it 'can edit default text shown in empty editors'
      this.sandbox = $('<p>')
      this.enableEditor({ default_text: 'fnord' }).should.have_text 'fnord'
    end
    
    it 'should show an empty editor even if default_text was shown in the element'
      this.sandbox = $('<p>')
      this.enableEditor({ default_text: 'fnord' }).click().find(':input').should.have_text ''
    end
    
    it 'can show as textarea with specified rows and cols'
      var textarea = this.openEditor({
        field_type:'textarea',
        textarea_rows:23,
        textarea_cols:42
      })
      
      textarea.should.have_attr 'rows', 23
      textarea.should.have_attr 'cols', 42
    end
    
    describe 'select fields'
      
      before
        this.selectOptions = function(overideOptions) {
          return $.extend({
            field_type:'select',
            select_text:'select_text',
            select_options:'first,second,third'
          }, overideOptions)
        }
        this.editorOptions = function(settings) {
          // get() makes the assertions output the dom instead of the last selector if they fail...
          return this.openEditor(this.selectOptions(settings)).find('option').get()
        }
      end
      
      it 'should show popup with custom values'
        var options = this.editorOptions({ select_options:'foo,bar' })
        options.should.have_length 3
        options[1].should.have_text 'foo'
        options[1].should.have_value 'foo'
        options[2].should.have_text 'bar'
        options[2].should.have_value 'bar'
      end
      
      it 'should have default value of "" for default value'
        var options = this.editorOptions({ select_text:'fnord' })
        options[0].should.have_text 'fnord'
        options[0].should.have_value ''
      end
      
      it 'should select item in popup which matches initial text'
        this.sandbox = $('<p>text</p>')
        var options = this.editorOptions({ select_options:'foo,text,bar' })
        options.should.have_length 4
        options[2].should.be_selected
      end
      
      it 'should allow select_options to specify different value and text as text:value'
        var options = this.editorOptions({ select_options:'text:value' })
        options[1].should.have_value 'value'
        options[1].should.have_text 'text'
      end
      
      it 'should not show spaces in popup specification in dom'
        var options = this.editorOptions({ select_options:'foo, bar, baz' })
        options.should.have_length 4
        options[2].should.have_text 'bar'
        options[2].should.have_value 'bar'
      end
      
      it 'should allow an array of strings for select values'
        var options = this.editorOptions({ select_options:['foo', 'bar'] })
        options.should.have_length 3
        options[1].should.have_text 'foo'
        options[1].should.have_value 'foo'
      end
      
      it 'should allow array of array of strings to specify selected value and text as ["text", "value"]'
        var options = this.editorOptions({ select_options:[['text', 'value']] })
        options.should.have_length 2
        options[1].should.have_text 'text'
        options[1].should.have_value 'value'
      end
      
      it 'should disable default choice in select'
        var options = this.editorOptions()
        options[0].should.be_disabled
      end
      
      it 'does not submit disabled default choice in select'
        $.should.not.receive 'ajax'
        this.edit(this.selectOptions({
          callback: function(unused, input) { return input; }
        }), '')
        this.sandbox.should.have_text "Some text"
      end
    
    end
    
    it 'should throw if unknown field_type is chosen'
      var _this = this;
      -{ _this.openEditor({ field_type: 'fnord' }) }.should.throw_error /Unknown field_type <fnord>/
    end
    
    it 'can set hover_class parameter to override directly setting colors'
      this.enableEditor({ hover_class: 'fnord'})
      this.sandbox.should.not.have_class 'fnord'
      this.sandbox.mouseenter().should.have_class 'fnord'
      this.sandbox.mouseleave().should.not.have_class 'fnord'
    end
    
    it 'should still commit if commit_if_nothing_was_changed is specified'
      $.should.receive 'ajax', 'once'
      this.openEditor({save_if_nothing_changed:true}).submit()
    end
    
    describe 'can override error_sink to get errors as callbacks'
    
      it 'can get empty value error'
        var sensor = null;
        var options = {
          value_required: true,
          error_sink: function(id, error){ sensor = error; }
        }
        this.edit(options, '')
        sensor.should.match "Error: You must enter a value to save this field"
      end
      
      it 'can get empty return value from callback error'
        var sensor = null;
        var options = {
          callback: function(){},
          error_sink: function(id, error) { sensor = error; }
        }
        this.edit(options, 'fnord')
        sensor.should.match "Error: Failed to save value: fnord"
      end
      
      it 'can get xhr submit errors'
        var sensor = null;
        stub($, 'ajax').and_return(function(options) { options.error({ responseText:'fnord' }); })
        var options = { error_sink: function(id, error) { sensor = error; } }
        this.edit(options, 'foo')
        sensor.should.match "fnord"
      end
    end
    
    it 'should not reset background color on submit if hover_class is specified'
      this.edit({ hover_class: 'fnord' })
      this.sandbox.css('background-color').should.be_within ['', 'inherit', 'transparent']
    end
    
    it 'should not reset background color on cancel if hover_class is specified'
      this.openEditor({hover_class: 'fnord'}).submit()
      this.sandbox.css('background-color').should.be_within ['', 'inherit', 'transparent']
    end
    
    it "should respect saving_animation_color (doesn't yet really test that the target color is reached though)"
      stub($, 'ajax').and_return($)
      this.edit({ saving_animation_color: '#002342' })
      this.sandbox.css('backgroundColor').should.be 'rgb(255, 255, 255)'
      tick(200) // first animation not yet finished
      this.sandbox.css('backgroundColor').should.not.be 'rgb(255, 255, 255)'
      this.sandbox.is(':animated').should.be true
    end
    
    describe 'callbacks'
      
      it 'shoud call preinit callback on click'
        var sensor = false
        var originalText = this.sandbox.text()
        this.sandbox.text().should.be originalText
        this.openEditor({
          preinit: function(domNode){ sensor = domNode.clone(true); return ''; },
        })
        sensor.text().should.be originalText
      end
      
      it 'should not open editor if preinit returns false'
        this.openEditor({ preinit: -{ return false; }})
        this.sandbox.should.not.have_tag ':input'
      end
      
      it 'should open the editor if preinit returns undefined (i.e. nothing)'
        this.openEditor({ preinit: -{}})
        this.sandbox.should.have_tag ':input'
      end
      
      it 'should not call preinit if element is cancelled'
        var sensor = 'not called'
        this.openEditor({ cancel: "p", preinit: -{sensor = 'preinit'}})
        sensor.should.be 'not called'
      end
      
      it 'should call postclose after editor is closed'
        var sensor
        var options = { postclose: function(domNode) {
          sensor = domNode.clone()
        }}
        this.edit(options, 'fnord')
        sensor.text().should.equal "fnord"
        sensor.children().should.be_empty
      end
      
      it 'should send postclose callback after cancel'
        var sensor
        this.openEditor({ postclose: function(domNode) {
          sensor = domNode.clone()
        }})
        this.sandbox.click().find(':input').blur()
        sensor.text().should.equal "Some text"
        sensor.children().should.be_empty
      end
      
      describe 'uses dom element of editor as this for callbacks'
        
        before
          this.sensed = undefined;
          var that = this;
          this.sensor = function sensor(){ that.sensed = this; return ''; }
        end
        
        after_each
          this.sensed.should.be this.sandbox[0]
        end
        
        it 'callback'
          this.edit({ callback: this.sensor })
        end
        
        it 'success'
          var serverSuccessCallback;
          stub($, 'ajax').and_return(function(options) { serverSuccessCallback = options.success; })
          this.edit({ success: this.sensor })
          serverSuccessCallback('fnord')
        end
        
        it 'error'
          var serverErrorCallback;
          stub($, 'ajax').and_return(function(options) { serverErrorCallback = options.error; })
          this.edit({ error: this.sensor })
          serverErrorCallback()
        end
        
        it 'error_sink'
          this.edit({ error_sink: this.sensor, callback: -{} /* triggers error */ })
        end
        
        it 'preinit'
          this.edit({ preinit: this.sensor })
        end
        
        it 'postclose'
          this.edit({ postclose: this.sensor })
        end
        
      end
      
      describe 'lifecycle callbacks'
        // TODO: check for all editor types, especially select fields
        // ideally, all callback tests should run with all editor types
        // This could be a fertile ground for the should_behave_like directive,
        // and a good call to split this into multiple files
        
        before_each
          this.sensor = {}
          var that = this;
          var originalEnableEditor = this.enableEditor
          stub(this, 'enableEditor').and_return(function(optionalSettings) {
            return originalEnableEditor.call(that, $.extend({ delegate: that.sensor }, optionalSettings))
          })
        end
        
        describe 'open'
          it 'should not open editor if shouldOpenEditInPlace returns false'
            this.sensor.should.receive_stub 'shouldOpenEditInPlace', false
            this.openEditor()
            this.sandbox.should.not.have_tag 'form'
          end
        
          it 'shouldOpenEditInPlace should get the click event as parameter'
            var event;
            this.sensor.should.receive_stub 'shouldOpenEditInPlace', -{ event = arguments[2] }
            this.openEditor()
            event.should.have_property 'type', 'click'
          end
                
          it 'should use return value of willOpenEditInPlace as initial value for editor'
            this.sensor.should.receive_stub 'willOpenEditInPlace', -{ return 'fnord' }
            this.openEditor().should.have_value 'fnord'
          end
        
          it 'should use return value of willOpenEditInPlace even if its falsy'
            this.sensor.should.receive_stub 'willOpenEditInPlace', ''
            this.openEditor().should.have_value ''
          end
          
          // TODO: willOpenEditInPlace is also called for select fields
          
          it 'should use original value if willOpenEditInPlace returns undefined'
            this.sandbox.text('fnord')
            this.sensor.should.receive_stub 'willOpenEditInPlace', -{}
            this.openEditor().should.have_value 'fnord'
          end
        
          it 'should call didOpenEditor once the editor is open'
            this.sensor.stub('willOpenEditInPlace').and_return('foo')
            this.sensor.should.receive_stub 'didOpenEditInPlace', function(dom) { $(dom).find(':input').val('fnord') }
            this.openEditor().should.have_value 'fnord'
          end
        end
        
        describe 'close'
        
          it 'shouldCloseEditInPlace should be able to cancel closing the editor'
            this.sensor.should.receive_stub 'shouldCloseEditInPlace', false
            this.edit('fnord').should.have_tag ':input'
          end
          
          it 'shouldCloseEditInPlace can cancel cancelling the editor'
            this.sensor.should.receive_stub 'shouldCloseEditInPlace', false
            this.openEditor({ on_blur:'cancel' }).blur() // no change == cancel
            this.sandbox.should.have_tag ':input'
          end
          
          // TODO: consider a test that the shouldCloseEditor is not called more than once?
          
          it 'shouldCloseEditInPlace should get the triggering event as parameter'
            var event
            this.sensor.should.receive_stub 'shouldCloseEditInPlace', -{ event = arguments[2] }
            this.edit()
            event.should.have_property 'type', 'submit'
          end
          
          it 'shouldCloseEditInPlace should get the triggering event as parameter on cancel'
            var event
            this.sensor.should.receive_stub 'shouldCloseEditInPlace', -{ event = arguments[2] }
            this.openEditor({ on_blur: 'cancel' }).blur()
            event.should.have_property 'type', 'blur'
          end
          
          it 'willCloseEditInPlace return value can override commit value'
            this.sensor.should.receive_stub 'willCloseEditInPlace', 'fnord'
            var committedText
            stub($, 'ajax').and_return(function(options) {
              options.data.should.include 'fnord'
            })
            this.edit({}, 'foo')
          end
          
          it "willCloseEditInPlace's return value will be shown during saving"
            this.sensor.should.receive_stub 'willCloseEditInPlace', 'fnord'
            stub($, 'ajax')
            this.edit({}, 'foo')
            this.sandbox.should.have_text('fnord')
          end
          
          it 'didCloseEditInPlace will be called after the editor is closed'
            function sensor(dom) {
              dom.should.not.have_tag 'form'
            }
            this.sensor.should.receive_stub 'didCloseEditInPlace', sensor
            this.edit()
          end
          
          it 'didCloseEditInPlace can change dom to be displayed after the editor closes'
            this.sensor.should.receive_stub 'didCloseEditInPlace', function(dom){ $(dom).text('fnord') }
            this.edit()
            this.sandbox.should.have_text 'fnord'
          end
          
        end
      end
      
    end
    
    describe 'cancelling elements'
    
      it 'should not open the editor if the clicked element is a cancel element'
        var child = $('<em>is bold</em>')
        this.sandbox.append(child)
        this.enableEditor({ cancel: "em"})
        child.click()
        this.sandbox.should.not.have_tag ':input'
      end
    
      it 'should not open the editor if the clicked element is child of cancelled element'
        var child = $('<em>is bold</em>')
        this.sandbox.append(child)
        this.enableEditor({ cancel: "p"})
        child.click()
        this.sandbox.should.not.have_tag ':input'
      end
    
      it 'should open the editor if cancel is empty'
        this.openEditor({ cancel: ""})
        this.sandbox.should.have_tag ':input'
      end
    
      it 'should not open the editor even clicking on one of two cancel elements'
        this.openEditor({ cancel: "a, p"})
        this.sandbox.should.not.have_tag ':input'
      end
      
    end
    
    describe 'editor value interaction can use .html() to'
      
      before_each
        this.sandbox.html('fno<span>rd</span>')
      end
      
      it 'set value of editor'
        this.openEditor({use_html:true}).should.have_value 'fno<span>rd</span>'
      end
      
      it 'select default options for select field'
        this.openEditor({use_html:true, field_type:'select', select_options:['foo:fnord', 'bar:fno<span>rd</span>']})
        this.sandbox.find(':input').should.have_value 'fno<span>rd</span>'
      end
      
      it 'determines if nothing changed'
        $.should.receive('ajax')
        this.edit({use_html:true}, 'fnord')
      end
      
    end
    
    describe 'can map legacy preference names to new preference names'
      
    end
    
  end
  
  describe 'edit field behaviour'
    // REFACT: this is probably a prime candidate to use the 'should_behave_like' directive
    $.each(['text', 'textarea', 'select'], function(index, type) {
      // sadly I can't just pass it through the scope as all functions are evaled in their own scope
      this.type = type;
      
      it 'should escape content when inserting text into the ' + this.type + ' editor'
        this.sandbox.text('&"<>');
        this.openEditor({field_type:this.type}).should.have_value '&"<>'
      end
      
      it 'should trim content when inserting text into the ' + this.type + ' editor'
        this.sandbox.text(' fnord ')
        this.openEditor({field_type:this.type}).should.have_value 'fnord'
      end
      
      it 'should restore original content when canceled out of ' + this.type
        this.sandbox.text('fnord')
        this.openEditor({ field_type:this.type }).submit()
        this.sandbox.should.have_text 'fnord'
      end
      
      it 'should submit enterd value to function when submitting ' + this.type
        var sensor = null
        var options = {
          field_type:this.type,
          callback: function(id, enteredText) { return sensor = enteredText; }
        }
        this.edit(options, 'fnord')
        sensor.should.equal 'fnord'
      end
      
      it 'should not remove content on opening editor if it is identical to the default_text ' + this.type
        this.sandbox = $('<p>fnord</p>')
        this.openEditor({ default_text:'fnord', field_type:this.type }).should.have_value 'fnord'
      end
      
      it 'should present an empty editor if the default text was entered by the editor itself ' + this.type
        this.sandbox = $('<p>')
        this.enableEditor({ default_text: 'fnord', field_type:this.type})
        this.sandbox.should.have_text 'fnord'
        this.sandbox.click().find(':input').should.have_value ''
        // also the second time
        this.sandbox.find(':input').submit()
        this.sandbox.click().find(':input').should.have_value ''
        // but not when it was changed in the meantime
        this.sandbox.find(':input').submit()
        this.sandbox.text('fnord')
        this.sandbox.click().find(':input').should.have_value 'fnord'
      end
      
      it 'should cancel with enter if no changes where made ' + this.type
        this.openEditor({ field_type:this.type })
        var enter = 13
        this.sandbox.find(':input').trigger({ type: 'keyup', which:enter })
        this.sandbox.should.not.have_tag 'form'
      end
      
      it 'should submit with enter if changes where made' + this.type
        this.edit({ field_type:this.type })
        this.sandbox.find(':input').trigger({ type: 'keyup', which: 13 /* enter */ })
        this.sandbox.should.not.have_tag 'form'
      end
      
      it 'should always have "inplace_name" as name and "inplace_field" as class' + this.type
        this.openEditor({ field_type: this.type })
        this.sandbox.find(':input').should.have_attr 'name', 'inplace_value'
      end
      
    })
    
    it 'will ignore multiple attempts to add an inline editor'
      this.numberOfHandlers = function() {
        var handlers = this.sandbox.data('events');
        if ( ! handlers)
          return 0;
        var count = 0;
        for (var key in handlers.click)
          count++;
        return count;
      }
      this.numberOfHandlers().should.be 0
      this.enableEditor()
      this.numberOfHandlers().should.be 1
      this.enableEditor()
      this.numberOfHandlers().should.be 1
    end
    
    it 'should cancel when escape is pressed while focus is in the editor'
      this.openEditor().trigger({type:'keyup', which:27 /* escape */})
      this.sandbox.should.not.have_tag 'form'
    end
    
    it 'will not restore ancient view content when escape is triggered after the editor has closed'
      this.edit({}, 'fnord')
      this.sandbox.should.have_text 'fnord'
      // try to get the handler to fire even if it shouldn't
      var escape = 27
      $(document).trigger({type:'keyup', which:escape})
      this.sandbox.trigger({type:'keyup', which:escape})
      this.sandbox.should.have_text 'fnord'
    end
    
    it 'should not submit on enter when showing textarea'
      var enter = 13
      this.openEditor({ field_type:'textarea'}).trigger({type:'keyup', which:enter})
      this.sandbox.should.have_tag 'form'
    end
    
  end
  
  describe 'browser specific behaviour'
  
    it "firefox does send other in place editors blur event (as the browser doesn't do it)"
      // can't return early out of an eval context....
      // consider to change jspec so these are real functions that are called like regular functions
      if ($.browser.mozilla) {
        // cold need to encapsulate in div
        this.sandbox = $('<div><p/><p/></div>')
        this.sandbox.find('p').editInPlace({url:'fnord'})
        // open both editors at the same time
        this.sandbox.find('p:first').click()
        this.sandbox.find('p:last').click()
        this.sandbox.find(':input').should.have_length 1
        this.sandbox.should.have_tag 'p:last :input'
      }
    end
    
    it 'webkit nightlies should commit on enter'
      if ($.browser.safari) {
        var enter = 13
        this.openEditor().val('fnord').trigger({ type:'keyup', which:enter})
        this.sandbox.should.not.have_tag 'form'
        this.sandbox.should.have_text 'fnord'
      }
    end
    
  end
  
end

__END__
