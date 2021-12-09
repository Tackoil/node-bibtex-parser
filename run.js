const fs = require('fs')
const bibParser = require('./bibParser')

for(let filename of [
    // './bibs/enbib.bib',
    // './bibs/ref.bib',
    // './bibs/reference.bib',
    // './bibs/references.bib',
    // './bibs/test.bib',
    './bibs/error.bib',
]) {
    const data = fs.readFileSync(filename, 'utf8');
    const result = bibParser(data);
    console.log(result);
}

