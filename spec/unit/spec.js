
describe 'jquery.editinplace'
  before
    this.editor = function(options) {
      return this.sandbox.editInPlace(options).click();
    }
  end
  
  before_each
    // If this is missing each request will grab the current page (no url specified)
    // and on inserting it, that will whipe the test results. (I don't quite understand why)
    mock_request().and_return('fnord')
    this.sandbox = $('<p>Some text</p>')
    // Workaround to jquery-ui bug that it can't reliably deal with document fragments not having a color at their root element
    this.sandbox.parent().css({ backgroundColor:'transparent' })
  end
  
  describe 'default settings'
    
    it 'can convert tag to editor'
      this.editor().should.have_tag 'input'
    end
    
    it 'leaves out buttons by default'
      this.editor().should.not.have_tags 'button'
    end
    
    it 'uses text as default field type'
      this.editor().should.have_tag 'input[type="text"]'
    end
    
    it 'will hover to yellow'
      this.sandbox.editInPlace().mouseover().css('background-color').should.equal 'rgb(255, 255, 204)'
      this.sandbox.mouseout().css('background-color').should.equal 'transparent'
    end
    
    it 'will show text during saving'
      stub($, 'ajax')
      this.editor().find(':input').val('fnord').submit()
      this.sandbox.should.have_text "Saving..."
    end
    
    it 'should show "click here to add text" if element is empty'
      $('<p>').editInPlace().should.have_text "(Click here to add text)"
    end
    
    it 'should always have "inplace_name" as name and "inplace_field" as class'
      function checkNameAndClass(editor) {
        editor.find(':input').should.have_attr 'name', 'inplace_value'
      }
      checkNameAndClass(this.editor())
      checkNameAndClass(this.editor({field_type:'textarea'}))
      checkNameAndClass(this.editor({field_type:'select'}))
    end
    
    it 'will size textareas 25x10'
      var textarea = this.editor({field_type:'textarea'}).find(':input')
      textarea.attr('cols').should.be 25
      textarea.attr('rows').should.be 10
    end
    
    describe 'ajax submissions'
      
      before_each
        var _this = this;
        stub($, 'ajax').and_return(function(options){ _this.url = options.data; })
      end
      
      after_each
        this.url = undefined
      end
      
      it 'will submit id of original element as element_id'
        this.sandbox.attr('id', 'fnord')
        this.editor().find(':input').val('foo').submit()
        this.url.should.include 'element_id=fnord'
      end
      
      it 'will submit content of editor as update_value'
        this.editor().find(':input').val('fnord').submit()
        this.url.should.include 'update_value=fnord'
      end
      
      it 'will submit original html with key original_html'
        this.sandbox.text('fnord')
        this.editor().find(':input').val('foo').submit()
        this.url.should.include 'original_html=fnord'
      end
      
      it 'will submit on blur'
        this.editor().find(':input').val('fnord').focus().blur()
        this.sandbox.should.have_text 'Saving...'
      end
      
      it 'will url encode entered text'
        this.editor().find(':input').val('%&=/<>').submit()
        this.url.should.include 'update_value=%25%26%3D%2F%3C%3E'
      end
      
      it 'will url encode original html correctly'
        this.sandbox.html('<p onclick="\"%&=/<>\"">')
        this.editor().find(':input').val('fnord').submit()
        this.url.should.include 'original_html=%3Cp%20onclick%3D%22%22%20%25%26%3D%22%2F%26lt%3B%22%3E%22%22%26gt%3B%3C%2Fp%3E'
      end
      
      it 'should not loose the param option on the second submit'
        var editor = this.editor({params: 'foo=bar'});
        editor.click().find(':input').val('fnord').submit()
        this.url.should.include 'foo=bar'
        editor.click().find(':input').val(23).submit()
        this.url.should.include 'foo=bar'
      end
      
    end
    
    it 'should not trigger submit if nothing was changed'
      $.should.receive 'ajax', '0'
      this.editor().find('form').submit()
    end
    
    it 'should not think that it has placed the default text in the editor if its content is changed from somewhere else'
      this.sandbox = $('<p></p>').editInPlace().text('fnord')
      this.sandbox.click().find(':input').val().should.equal 'fnord'
    end
    
  end
  
  describe 'marker classes'
    
    it 'should set .editInPlace-active when activating editor'
      this.sandbox.should.not.have_class '.editInPlace-active'
      this.sandbox.editInPlace().click().should.have_class '.editInPlace-active'
    end
    
    it 'should remove .editInPlace-active when editor finished submitting'
      var editor = this.editor()
      editor.should.have_class '.editInPlace-active'
      editor.find(':input').val('fnord').submit();
      editor.should.not.have_class '.editInPlace-active'
    end
    
    it 'should remove .editInPlace-active when cancelling the editor'
      this.editor().find(':input').submit();
      this.sandbox.should.not.have_class '.editInPlace-active'
    end
    
    it 'should remove .editInPlace-active when the callback returns if no animation callbacks are used'
      var editor = this.editor({ callback: function(){ return ''; } })
      editor.find(':input').val('bar').submit()
      editor.should.not.have_class '.editInPlace-active'
    end
    
    it 'should not remove .editInPlace-active if didStartSaving() is called before callback returns'
      var callbacks;
      var editor = this.editor({ callback: function(idOfEditor, enteredText, orinalHTMLContent, settingsParams, animationCallbacks) {
        callbacks = animationCallbacks;
        callbacks.didStartSaving();
        return '';
      }})
      editor.find(':input').val('fnord').submit()
      editor.should.have_class '.editInPlace-active'
      callbacks.didEndSaving();
      editor.should.not.have_class '.editInPlace-active'
    end
    
    it 'should ignore animation callbacks after submit callback has returned'
      var callbacks;
      var editor = this.editor({ callback: function(idOfEditor, enteredText, orinalHTMLContent, settingsParams, animationCallbacks) {
        callbacks = animationCallbacks;
        return '';
      }})
      editor.find(':input').val('fnord').submit()
      editor.should.not.have_class '.editInPlace-active'
      
      -{ callbacks.didStartSaving() }.should.throw_error /Cannot call/
      -{ callbacks.didEndSaving() }.should.throw_error /Cannot call/
    end
    
    it 'should not call didEndSaving() before didStartSaving() was called'
      var editor = this.editor({ callback: function(idOfEditor, enteredText, orinalHTMLContent, settingsParams, animationCallbacks) {
        -{ animationCallbacks.didEndSaving() }.should.throw_error /Cannot call/
        return '';
      }})
      editor.find(':input').val('fnord').submit()
    end
    
    it 'should allow to call both callbacks before the callback returns'
      var editor = this.editor({ callback: function(idOfEditor, enteredText, orinalHTMLContent, settingsParams, animationCallbacks) {
        animationCallbacks.didStartSaving();
        animationCallbacks.didEndSaving();
        return '';
      }})
      editor.find(':input').val('fnord').submit()
      
      // direct sensing is not possible, so we check that only one inline editor is attached to the click event now
      var clickEvents = editor.data('events').click
      var count = 0
      for (var key in clickEvents)
        count++
      count.should.be 1
    end
    
  end
  
  describe 'animations during save'
    
    it 'should animate during ajax save to server'
      var complete
      stub($, 'ajax').and_return(function(options) { complete = options.complete; })
      this.editor().find(':input').val('fnord').submit();
      
      this.sandbox.is(':animated').should.be true
      complete();
      this.sandbox.is(':animated').should.be false
    end
    
    it 'should animate when callbacks are called when submitting to callback'
      var complete
      var editor = this.editor({ callback: function(idOfEditor, enteredText, orinalHTMLContent, settingsParams, animationCallbacks) {
        animationCallbacks.didStartSaving();
        complete = animationCallbacks.didEndSaving;
        return '';
      }})
      editor.find(':input').val('fnord').submit()
      
      this.sandbox.is(':animated').should.be true
      complete();
      this.sandbox.is(':animated').should.be false
    end
    
    it 'should not animate if callbacks are not called when submitting to callback'
      var editor = this.editor({ callback: function() { return ''; }})
      editor.find(':input').val('fnord').submit()
      this.sandbox.is(':animated').should.be false
    end
    
  end

  describe 'submit to callback'
    
    before
      // stub($, 'ajax') // don't want any submits to happen
    end
    
    it 'shoud call callback on submit'
      var sensor = false;
      this.editor({
        callback: -{ sensor = true; return ''; },
      }).find(':input').val('fnord').submit()
      sensor.should.be true
    end
    
    it 'will replace editor with its return value'
      this.editor({ callback: -{ return 'fnord' } }).find(':input').val('fnord').submit()
      this.sandbox.should.have_text 'fnord'
    end
    
    it 'can return 0 from callback'
      this.editor({callback: -{ return 0; }}).find(':input').val('fnord').submit()
      this.sandbox.should.have_text "0"
    end
    
    it 'can return empty string from callback'
      this.editor({callback: -{ return ''; }}).find(':input').val('fnord').submit()
      this.sandbox.should.have_text ''
    end
    
  end
  
  describe 'custom settings'
    
    it 'should add params as additional parameters to post-url'
      var url
      stub($, 'ajax').and_return(function(options) { url = options.data; })
      this.editor({params: 'foo=bar'}).find(':input').val('fnord').submit()
      url.should.include 'foo=bar'
    end
    
    it 'can edit default text shown in empty editors'
      $('<p>').editInPlace({ default_text: 'fnord' }).should.have_text 'fnord'
    end
    
    it 'should show an empty editor even if default_text was shown in the element'
      $('<p>').editInPlace({ default_text: 'fnord' }).click().find(':input').should.have_text ''
    end
    
    it 'can show as textarea with specified rows and cols'
      var textarea = this.editor({
        field_type:'textarea',
        textarea_rows:23,
        textarea_cols:42
      }).find('textarea')
      
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
          return this.editor(this.selectOptions(settings)).find('option').get()
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
        var foo = this.editor(this.selectOptions({
          callback: function(unused, input) { return input; }
        })).find(':input').val('').submit()
        this.sandbox.should.have_text "Some text"
      end
      
    end
    
    it 'should throw if unknown field_type is chosen'
      var _this = this;
      -{ _this.editor({ field_type: 'fnord' }) }.should.throw_error /Unknown field_type <fnord>/
    end
    
    it 'can set hover_class parameter to override directly setting colors'
      this.sandbox.editInPlace({ hover_class: 'fnord'})
      this.sandbox.should.not.have_class 'fnord'
      this.sandbox.mouseenter().should.have_class 'fnord'
      this.sandbox.mouseleave().should.not.have_class 'fnord'
    end
    
    it 'should still commit if commit_if_nothing_was_changed is specified'
      $.should.receive 'ajax', 'once'
      this.editor({save_if_nothing_changed:true}).find('form').submit()
    end
    
    describe 'can override error_sink to get errors as callbacks'
    
      it 'can get empty value error'
        var sensor = null;
        this.editor({
          value_required:true,
          error_sink:function(id, error){ sensor = error; }
        }).find(':input').val('').submit()
        sensor.should.match "Error: You must enter a value to save this field"
      end
      
      it 'can get empty return value from callback error'
        var sensor = null;
        this.editor({
          callback:function(){},
          error_sink:function(id, error) { sensor = error; }
        }).find(':input').val('fnord').submit()
        sensor.should.match "Error: Failed to save value: fnord"
      end
      
      it 'can get xhr submit errors'
        var sensor = null;
        stub($, 'ajax').and_return(function(options) { options.error({ responseText:'fnord' }); })
        this.editor({ error_sink: function(id, error) { sensor = error; } }).find(':input').val('foo').submit()
        sensor.should.match "fnord"
      end
    end
    
    it 'should not reset background color on submit if hover_class is specified'
      this.editor({hover_class: 'fnord'}).find(':input').val('fnord').submit();
      this.sandbox.css('background-color').should.be_within ['', 'inherit', 'transparent']
    end
    
    it 'should not reset background color on cancel if hover_class is specified'
      this.editor({hover_class: 'fnord'}).find('form').trigger({type:'keyup', which:27 /* escape */})
      this.sandbox.css('background-color').should.be_within ['', 'inherit', 'transparent']
    end
    
    it "should respect saving_animation_color (doesn't yet really test that the target color is reached though)"
      stub($, 'ajax').and_return($)
      this.editor({ saving_animation_color: '#002342' }).find(':input').val('fnord').submit()
      this.sandbox.css('backgroundColor').should.be 'rgb(255, 255, 255)'
      tick(200) // first animation not yet finished
      this.sandbox.css('backgroundColor').should.not.be 'rgb(255, 255, 255)'
      this.sandbox.is(':animated').should.be true
    end
  end
  
  describe 'edit field behaviour'
    
    $.each(['text', 'textarea', 'select'], function(index, type) {
      // sadly I can't just pass it through the scope as all functions are evaled in their own scope
      this.type = type;
      
      it 'should escape content when inserting text into the ' + this.type + ' editor'
        this.sandbox.text('&"<>');
        this.editor({field_type:this.type}).find(':input').should.have_value '&"<>'
      end
      
      it 'should trim content when inserting text into the ' + this.type + ' editor'
        this.sandbox.text(' fnord ')
        this.editor({field_type:this.type}).find(':input').should.have_value 'fnord'
      end
      
      it 'should restore original content when canceled out of ' + this.type
        this.sandbox.text('fnord')
        this.editor({
          field_type:this.type,
          on_blur:'cancel'
        }).find(':input').blur()
        this.sandbox.should.have_text 'fnord'
      end
      
      it 'should submit enterd value to function when submitting ' + this.type
        var sensor = null
        var input = this.editor({
          field_type:this.type,
          callback: function(id, enteredText) { return sensor = enteredText; }
        }).find(':input')
        input.val('fnord').blur()
        sensor.should.equal 'fnord'
      end
      
      it 'should not remove content, even if it is identical to the default_text ' + this.type
        this.sandbox = $('<p>fnord</p>')
        this.editor({ default_text:'fnord', field_type:this.type }).find(':input').should.have_value 'fnord'
      end
      
      it 'should present an empty editor if the default text was entered by the editor itself ' + this.type
        this.sandbox = $('<p></p>').editInPlace({ default_text: 'fnord', on_blur: 'cancel' , field_type:this.type})
        this.sandbox.should.have_text 'fnord'
        this.sandbox.click().find(':input').should.have_value ''
        // also the second time
        this.sandbox.find(':input').blur()
        this.sandbox.click().find(':input').should.have_value ''
        // but not when it was changed in the meantime
        this.sandbox.find(':input').blur()
        this.sandbox.text('fnord')
        this.sandbox.click().find(':input').should.have_value 'fnord'
      end
      
      it 'should cancel with enter if no changes where made'
        this.sandbox.editInPlace({field_type:this.type}).click()
        
        this.sandbox.find('form').trigger({ type: 'keyup', which: 13 /* enter */ })
        this.sandbox.should.not.have_tag 'form'
      end
      
      it 'should submit with enter if changes where made'
        this.sandbox.editInPlace({field_type:this.type}).click().find(':input').val('fnord')
        this.sandbox.find('form').trigger({ type: 'keyup', which: 13 /* enter */ })
        this.sandbox.should.not.have_tag 'form'
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
      this.sandbox.editInPlace()
      this.numberOfHandlers().should.be 1
      this.sandbox.editInPlace()
      this.numberOfHandlers().should.be 1
    end
    
    it 'should cancel when escape is pressed while focus is in the editor'
      this.editor().find(':input').trigger({type:'keyup', which:27 /* escape */})
      this.sandbox.should.not.have_tag 'form'
    end
    
    it 'will not restore ancient view content when escape is triggered after the editor has closed'
      this.editor().find(':input').val('fnord').submit()
      this.sandbox.should.have_text 'fnord'
      // try to get the handler to fire even if it shouldn't
      $(document).trigger({type:'keyup', which:27 /* escape */})
      this.sandbox.trigger({type:'keyup', which:27 /* escape */})
      this.sandbox.should.have_text 'fnord'
    end
    
  end
  
  describe 'browser specific behaviour'
    it "firefox does send other in place editors blur event (as the browser doesn't do it)"
      // can't return early out of an eval context....
      if ($.browser.mozilla) {
        // cold need to encapsulate in div
        this.sandbox = $('<div><p/><p/></div>')
        this.sandbox.find('p').editInPlace()
        // open both editors at the same time
        this.sandbox.find('p:first').click()
        this.sandbox.find('p:last').click()
        this.sandbox.find(':input').should.have_length 1
        this.sandbox.should.have_tag 'p:last :input'
      }
    end
  end
  
end

__END__
