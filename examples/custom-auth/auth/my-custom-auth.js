/**
 * Custom auth system for demostrative purposes.
 *
 * To login, do a GET to /login.  Pass the name query parameter to control your name, or leave blank for anonymous
 * Use /logout to log out
 * All routes will require you to be logged in or else you'll get a 401.
 * @param app
 */
exports.init = function (app) {

    app.get('/login', function (req, res) {
        var username = req.query.name || 'anonymous';
        req.session.auth = {
            id: username
        };
        res.status(200).send('You logged in as ' + username);
    });

    app.get('/logout', function (req, res) {
        var username = 'anonymous';
        if (req.session.auth) {
            username = req.session.auth.id;
        }

        delete req.session.auth;

        res.status(200).send('You logged out as ' + username);
    });
};

exports.authenticate = function (req, res, next) {
    if (req.session.auth) {
        req.user = {
            id: req.session.auth.id
        };
    } else {
        return res.status(401).send('Log in first at /login');
    }
    next();
};