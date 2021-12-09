// Grammar implemented here:
//  bibtex -> (string | entry)*;
//  string -> '@STRING' kv_left key_equals_value kv_right;
//  entry -> '@' key kv_left key ',' key_value_list kv_right;
//  key_value_list -> key_equals_value (',' key_equals_value)* ','?;
//  key_equals_value -> key '=' value;
//  value -> value_quotes | value_braces | key;
//  value_quotes -> '"' .*? '"'; // not quite
//  value_braces -> '{' .*? '"'; // not quite
//  kv_left -> '(' | '{'
//  kv_right -> ')' | '}'

function BibtexParser() {
  this._entries = {};
  this._comments = [];
  this._strings = {};
  this.input = '';
  this.config = {
      upperKeys: false,
  }

  this._pos = 0;

  const pairs = {
    '{': '}',
    '(': ')',
    '"': '"',
  }

  const regs = {
    atKey: /@([a-zA-Z0-9_:\\./-]+)\s*/,
    enLeft: /^([\{\(])\s*/,
    enRight: function(left){
      return new RegExp(`^(\\${pairs[left]})\\s*`)
    },
    entryId: /^\s*([a-zA-Z0-9_:\\./-]+)\s*,\s*/,
    key: /^([a-zA-Z0-9_:\\./-]+)\s*=\s*/,
    vLeft: /^([\{"])\s*/,
    vRight: function(left){
      return new RegExp(`^(\\${pairs[left]})\\s*`)
    },
    inVLeft: /^(\{)\s*/,
    inVRight: function(left){
      return new RegExp(`^(\\${pairs[left]})\\s*`)
    },
    value: /^[\{"]((?:[^\{\}]|\n)*?(?:(?:[^\{\}]|\n)*?\{(?:[^\{\}]|\n)*?\})*?(?:[^\{\}]|\n)*?)[\}"]\s*,?\s*/,
    word: /^([^\{\}"\s]+)\s*/,
    comma: /^(,)\s*/,
    quota: /^(")\s*/
  }

  this.setInput = function(t) {
    this.input = t;
  }

  this.matchFirst = function(reg, notMove=false){
    let result = this.input.slice(this._pos).match(reg);
    if(result){
      if(!notMove){
        // console.log("!@#!@#", result[1]);
        this._pos += result.index + result[0].length;
      }
      return {
        success: true,
        text: result[1],
        index: result.index,
        step: result[0].length,
      }
    } else {
      return {
        success: false
      }
    }
  }

  this.assert = function(obj){
    for(const key in obj){
      if(obj[key] === undefined){
        throw `[BibParser:ERROR] ${key} not found at ${this._pos}`;
      }
    }
  }

  this.getValue = function(){
    const stack = [];
    const values = [];
    const {text:vLeft} = this.matchFirst(regs.vLeft);
    this.assert({vLeft});
    stack.push(vLeft);
    while(stack.length > 0){
      if(this.matchFirst(regs.inVLeft, true).success){
        const {text:inVLeft} = this.matchFirst(regs.inVLeft);
        stack.push(inVLeft);
        values.push(inVLeft);
      } else if(this.matchFirst(regs.inVRight(stack[stack.length-1]), true).success) {
        values.push(this.matchFirst(regs.inVRight(stack[stack.length-1])).text);
        stack.pop();
      } else if(this.matchFirst(regs.word, true).success){
        values.push(this.matchFirst(regs.word).text);
      } else if(this.matchFirst(regs.quota, true).success){
        values.push(this.matchFirst(regs.quota).text);
      } else {
        throw `[BibParser:ERROR] stack overflow at ${this._pos}`;
      }
    }
    values.pop();
    this.matchFirst(regs.comma);
    return values;
  }

  this.string = function(){
    const {text:key} = this.matchFirst(regs.key);
    this.assert({key});
    const {text:value} = this.matchFirst(regs.value);
    this.assert({value});
    this._strings[key] = value;
  }

  this.preamble = function(){

  }

  this.comment = function(){

  }

  this.entry = function(head){
    const {text:entryId} = this.matchFirst(regs.entryId);
    this.assert({entryId});
    const entry = {};
    while(this.matchFirst(regs.key, true).success){
      const {text:key} = this.matchFirst(regs.key);
      const value = this.getValue();
      entry[key] = value.join(' ');
      // if(key === 'author'){
      //   const {text:value} = this.matchFirst(regs.value);
      //   this.assert({value});
      //   entry[key] = value;
      // } else {
      //   const {text:value} = this.matchFirst(regs.value);
      //   this.assert({value});
      //   entry[key] = value;
      // }
    }
    entry.$type = head;
    this._entries[entryId] = entry;
  }

  this.parse = function(){
    while(this.matchFirst(regs.atKey, true).success){
      const {text:head} = this.matchFirst(regs.atKey);
      const {text:enLeft} = this.matchFirst(regs.enLeft);
      this.assert({enLeft});
      if (head.toUpperCase() == 'STRING') {
        this.string();
      } else if (head.toUpperCase() == 'PREAMBLE') {
        this.preamble();
      } else if (head.toUpperCase() == 'COMMENT') {
        this.comment();
      } else {
        this.entry(head);
      }
      const {text:enRight} = this.matchFirst(regs.enRight(enLeft));
      this.assert({enRight})
    }
  }
}

//Runs the parser
function doParse(input) {
  var b = new BibtexParser()
  b.setInput(input)
  b.parse()
  return b._entries;
}

module.exports = doParse