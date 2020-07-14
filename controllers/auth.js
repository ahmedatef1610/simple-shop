const mongoose = require('mongoose');
const User = require('../models/user');

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

const {
    validationResult
} = require('express-validator/check');
/*****************/
const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: ""
    }
}))
/*****************/
exports.getLogin = (req, res, next) => {

    // console.log(req.session.isLoggedIn);
    // console.log(req.sessionID);
    // console.log(req.session.id);


    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null
    }

    res.render('auth/login', {
        pageTitle: 'Login',
        path: '/login',
        errorMessage: message,
        oldInput: {
            email: '',
            password: '',
        },
        validationErrors: []
    });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render('auth/login', {
            pageTitle: 'Login',
            path: '/login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email,
                password,
            },
            validationErrors: errors.array()
        });
    }

    User.findOne({
            email
        }).then(user => {
            if (!user) {
                return res.status(422).render('auth/login', {
                    pageTitle: 'Login',
                    path: '/login',
                    errorMessage: 'Invalid email or password',
                    oldInput: {
                        email,
                        password,
                    },
                    validationErrors: [{param:'email'}]
                });
            }
            bcrypt.compare(password, user.password)
                .then(doMatch => {
                    if (doMatch) {
                        req.session.isLoggedIn = true;
                        req.session.user = user;
                        return req.session.save((err) => {
                            console.log(err);
                            res.redirect('/');
                        })
                    } else {
                        return res.status(422).render('auth/login', {
                            pageTitle: 'Login',
                            path: '/login',
                            errorMessage: 'Invalid email or password',
                            oldInput: {
                                email,
                                password,
                            },
                            validationErrors: [{param:'password'}]
                        });
                    }
                })
                .catch(err => {
                    console.log(err)
                    res.redirect('/login')
                })
        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postLogout = (req, res, next) => {
    req.session.destroy((err) => {
        console.log(err);
        res.redirect('/');
    })
};


exports.getSignup = (req, res, next) => {

    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null
    }

    res.render('auth/signup', {
        pageTitle: 'Signup',
        path: '/signup',
        errorMessage: message,
        oldInput: {
            email: '',
            password: '',
            confirmPassword: ''
        },
        validationErrors: []

    });
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render('auth/signup', {
            pageTitle: 'Signup',
            path: '/signup',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email,
                password,
                confirmPassword
            },
            validationErrors: errors.array()
        });
    }

    bcrypt.hash(password, 12)
        .then((hashPassword) => {
            const user = new User({
                email,
                password: hashPassword,
                cart: {
                    items: []
                }
            });
            return user.save()
        })
        .then(() => {

            let mailOptions = {
                to: email,
                from: "shop@node-complete.com",
                subject: 'Signup Succeeded! 🥳🥳',
                html: '<h1>You successfully signed up! 🥳🥳</h1>'
            }

            res.redirect('/login');
            return transporter.sendMail(mailOptions).catch((err) => {
                console.log(err)
            });
        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        })

};

exports.getReset = (req, res, next) => {

    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null
    }

    res.render('auth/reset', {
        pageTitle: 'Reset Password',
        path: '/reset',
        errorMessage: message,
    });


}


exports.postReset = (req, res, next) => {

    crypto.randomBytes(32, (err, buffer) => {

        if (err) {
            console.log(err);
            return res.redirect('/reset');
        }

        const token = buffer.toString('hex');

        User.findOne({
                email: req.body.email
            })
            .then(user => {
                if (!user) {
                    req.flash('error', "No account with that email found.")
                    return res.redirect('/reset')
                } else {
                    user.resetToken = token;
                    user.resetTokenExpiration = Date.now() + 3600000;
                    return user.save();
                }
            })
            .then((result) => {
                let mailOptions = {
                    to: req.body.email,
                    from: "shop@node-complete.com",
                    subject: 'Password Reset',
                    html: `
                    <p> you requested a password reset </p>
                    <p> Click this <a href="http://localhost:8080/reset/${token}">link</a> to set a new password </p>
                    `
                }
                transporter.sendMail(mailOptions).catch((err) => {
                    console.log(err)
                });
                res.redirect('/');
            })
            .catch(err => {
                const error = new Error(err)
                error.httpStatusCode = 500;
                return next(error);
            })

    });

}

exports.getNewPassword = (req, res, next) => {

    const token = req.params.token;


    User.findOne(({
            resetToken: token,
            resetTokenExpiration: {
                $gt: Date.now()
            }
        })).then(user => {
            let message = req.flash('error');
            if (message.length > 0) {
                message = message[0];
            } else {
                message = null
            }

            res.render('auth/new-password', {
                pageTitle: 'Reset Password',
                path: '/new-password',
                errorMessage: message,
                userId: user._id.toString(),
                passwordToken: token,
            });
        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        })



}
exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;

    User.findOne(({
            resetToken: passwordToken,
            resetTokenExpiration: {
                $gt: Date.now()
            },
            _id: userId
        }))
        .then(user => {
            resetUser = user;
            return bcrypt.hash(newPassword, 12);
        })
        .then(hashPassword => {

            resetUser.password = hashPassword;
            resetUser.resetToken = undefined;
            resetUser.resetTokenExpiration = undefined;

            return resetUser.save();
        })
        .then(() => {

            res.redirect('/login');
        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        })

}
