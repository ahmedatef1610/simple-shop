const express = require('express');
const bodyParser = require('body-parser')
const path = require('path')

const mongoose = require('mongoose');
const User = require('./models/user');

const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

const csrf = require('csurf');

const flash = require('connect-flash');

const multer = require('multer');


/****************************/
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const errorController = require('./controllers/error');
const shopController = require('./controllers/shop');
/***********************************************************/
const isAuth = require('./middleware/is-auth.js');
/***********************************************************/
/****************************/
const app = express();
const port = 8080;
/****************************/

let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'images')
    },
    filename: function (req, file, cb) {
        let date = new Date().toISOString();
        console.log(date);
        cb(null, `${Date.now()} - ${file.originalname}`)
    }
});

let fileFilter = (req, file, cb) => {
    if (file.mimetype == 'image/png' ||
        file.mimetype == 'image/jpg' ||
        file.mimetype == 'image/jpeg') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

//app.use(multer({dest:'images'}).single('image'));
app.use(multer({storage,fileFilter}).single('image'))
/****************************/
app.set('view engine', 'ejs');
app.set('views', 'views');
/****************************/
app.use(bodyParser.urlencoded({extended: false}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images',express.static(path.join(__dirname, 'images')));

const store = new MongoDBStore({
    uri: 'mongodb+srv://ahmed:1610@cluster0-rrcal.mongodb.net/shop?retryWrites=true&w=majority',
    collection: 'sessions'
});

app.use(session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false
    },
    store
}));



app.use(flash());
/****************************/

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    next();
})

app.use((req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    User.findById(req.session.user._id)
        .then(user => {
            if (!user) {
                return next();
            }
            req.isLoggedIn = req.session.isLoggedIn;
            req.user = user;
            next();
        })
        .catch(err => {
            next(new Error(err));
        });
})


/****************************/
//because of stripe have own form
app.post('/create-order', isAuth, shopController.postOrder);

const csrfProtection = csrf({})
app.use(csrfProtection);
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
})
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
app.get('/500', errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {
    res.redirect('/500');
    // res.status(500).render('500', {
    //     pageTitle: 'Error!',
    //     path: '/500',
    //     isAuthenticated: req.session.isLoggedIn
    // });
})
/****************************/
const uri = "mongodb+srv://ahmed:1610@cluster0-rrcal.mongodb.net/shop?retryWrites=true&w=majority";
mongoose.connect(uri)
    .then(() => {
        app.listen(port, () => {
            console.log(`Example app listening on port ${port}!`)
        });
    })
    .catch(err => {
        console.log(err);
    })