describe 'jquery.editinplace'
  should_behave_like('shared setup')
  
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
    
    it 'can show as input with specified size'
      var input = this.openEditor({ 
        field_type: 'text',
        text_size: '23'
      })
      
      input.should.have_attr 'size', 23
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
  
  
end

__END__
