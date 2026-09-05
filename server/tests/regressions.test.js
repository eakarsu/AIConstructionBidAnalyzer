const test=require('node:test'),assert=require('node:assert/strict'),p=require('../domain/bidPolicy');
test('blank quantities and unknown risk counts cannot pass',()=>{assert.throws(()=>p.normalizeQuantity(null,'ft'));assert.equal(p.canApprove('estimator','review',null),false);});
test('duplicate scope cannot silently overwrite a competing bid line',()=>{assert.throws(()=>p.compareScope([{code:'a',quantity:1,unit:'ft'}],[{code:'a',quantity:1,unit:'ft'},{code:'a',quantity:2,unit:'ft'}]),/Unique/);});
test('positive quantity against zero baseline is not zero variance',()=>{assert.equal(p.compareScope([{code:'a',quantity:0,unit:'ft'}],[{code:'a',quantity:1,unit:'ft'}])[0].variance,null);});
