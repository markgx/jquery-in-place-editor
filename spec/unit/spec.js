
describe 'jquery.editinplace'
  before
    this.editor = function(options) {
      return this.sandbox.editInPlace(options).click()
    }
  end
  
  before_each
    this.sandbox = $('<p>Some text</p>')
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
      this.sandbox.editInPlace().mouseover().css('background').should.equal 'rgb(255, 255, 204)'
      this.sandbox.mouseout().css('background').should.equal 'transparent'
    end
    
    it 'will show text during saving'
      stub($, 'ajax')
      this.editor().find(':input').submit()
      this.sandbox.should.have_text "Saving..."
    end
    
    it 'should show "click here to add text" if element is empty'
      this.sandbox = $('<p>').editInPlace().should.have_text "(Click here to add text)"
    end
    
    describe 'ajax submissions'
      
      before_each
        stub($, 'ajax')
        var _this = this;
        $.ajax = function(options) { _this.url = options.data; }
      end
      
      it 'will submit id of original element as element_id'
        this.sandbox.attr('id', 'fnord')
        this.editor().find('form').submit()
        this.url.should.include 'element_id=fnord'
      end
      
      it 'will submit content of editor as update_value'
        this.editor().find(':input').val('fnord').submit()
        this.url.should.include 'update_value=fnord'
      end
      
      it 'will submit original html with key original_html'
        this.sandbox.text('fnord')
        this.editor().find('form').submit()
        this.url.should.include 'original_html=fnord'
      end
      
      it 'will submit on blur'
        this.editor().find(':input').focus().blur()
        this.sandbox.should.have_text 'Saving...'
      end
      
    end
    
  end
  
  describe 'submit to callback'
    
    before
      // stub($, 'ajax') // don't want any submits to happen
    end
    
    it 'shoud call callback on submit'
      var called
      this.editor({
        callback: -{ called = true; },
        callbackShowErrors: false
      }).find('form').submit()
      called.should.be true
    end
    
    it 'will replace editor with its return value'
      this.editor({ callback: -{ return 'fnord' } }).find('form').submit()
      this.sandbox.should.have_text 'fnord'
    end
    
  end
  
  describe 'custom settings'
    
    it 'should add params as additional parameters to post-url'
      stub($, 'ajax')
      var url
      $.ajax = function(options) { url = options.data; }
      this.editor({params: 'foo=bar'}).find('form').submit()
      url.should.include 'foo=bar'
    end
  end
end

__END__

