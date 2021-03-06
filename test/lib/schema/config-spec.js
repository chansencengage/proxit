var chai = require('chai'),
    expect = chai.expect,
    schemas = require('../../../lib/schemas');

describe('/config schema', function() {
    it('should allow port', function() {
        valid({
            port: 9000
        });
    });

    it('should tolerate an empty config', function() {
        valid({});
    });

    it('should not allow junk to be passed', function() {
        invalid({
            junk: true
        });
    });

    it('should not allow a non numeric port', function() {
        invalid({
            port: 'a'
        });
    });

    it('should support verbose flag set to true', function() {
        valid({
            verbose: true
        });
    });

    it('should support verbose flag set to false', function() {
        valid({
            verbose: false
        });
    });

    it('should not allow non boolean data for verbose flag', function() {
        invalid({
            verbose: 1
        });
    });

    it('should allow a routes object with string values', function() {
        valid({
            routes: {
                '/': 'someurl'
            }
        });
    });

    it('should not allow a routes object with non-string values', function() {
        invalid({
            routes: {
                '/': {}
            }
        });
    });

    it('should not allow an empty routes object', function() {
        invalid({
            routes: {

            }
        });
    });

    it('should allow an array of hostnames to intercept', function() {
        valid({
            hostnames: ['www.mycompany.com'],
            routes: {
                '/': '/somefolder'
            }
        });
    });

    it('should allow an array of hosts', function() {
        valid({
            hosts: [{
                hostnames: ['www.mycompany.com'],
                routes: {
                    '/': '/somefolder'
                }
            }]
        });
    });

    it('should not allow invalid hosts', function() {
        invalid({
            hosts: [{
                hostnames: ['www.mycompany.com'],
                routes: {}
            }]
        });
    });

    function valid(options) {
        expect(schemas.validate(options, '/config')).to.eql(true);
    }

    function invalid(options) {
        expect(schemas.validate(options, '/config')).to.eql(false);
    }
});
