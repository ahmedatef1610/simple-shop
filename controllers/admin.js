const Product = require('../models/product');

const {
    validationResult
} = require('express-validator/check');

const fileHelper = require('../util/file');
/*****************/
exports.getAddProducts = (req, res, next) => {
    if (!req.isLoggedIn) {
        return res.redirect('/login');
    }
    res.render('admin/edit-product', {
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editing: false,
        hasError: false,
        errorMessage: null,
        validationErrors: []
    })
};


exports.postAddProducts = (req, res, next) => {

    const title = req.body.title;
    const image = req.file;
    const price = req.body.price;
    const description = req.body.description;
    console.log(1, image);

    if (!image) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title,
                price,
                description,
            },
            errorMessage: 'attached file is not an image',
            validationErrors: [{
                param: 'image'
            }]
        })
    };

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title,
                imageUrl,
                price,
                description,
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        })
    }

    const imageUrl = image.path;

    const product = new Product({
        title,
        price,
        description,
        imageUrl,
        userId: req.user
    });

    product.save()
        .then(result => {
            res.redirect('/products');
        })
        .catch(err => {
            // return res.status(500).render('admin/edit-product', {
            //     pageTitle: 'Add Product',
            //     path: '/admin/add-product',
            //     editing: false,
            //     hasError: true,
            //     product: {
            //         title,
            //         imageUrl,
            //         price,
            //         description,
            //     },
            //     errorMessage: "Database Operation Failed, please try again",
            //     validationErrors: errors.array()
            // })

            //res.redirect('/500');

            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        });


};

exports.getProducts = (req, res, next) => {

    Product
        //.find()
        .find({
            'userId': req.user._id
        })
        // .select('title price -_id imageUrl')
        // .populate('userId','email')
        .then(products => {
            // console.log(products);
            res.render('admin/products', {
                prods: products,
                pageTitle: 'Admin Products',
                path: '/admin/products',
            });
        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        })
};

exports.getEditProduct = (req, res, next) => {

    const productId = req.params.productId;
    const editMode = req.query.edit;

    if (!editMode || editMode !== 'true') {
        res.redirect('/');
    }

    Product.findById(productId)
        .then((product) => {
            if (!product) {
                return res.redirect('/');
            }
            res.render('admin/edit-product', {
                product,
                pageTitle: 'Edit Product',
                path: '/admin/edit-product',
                editing: editMode,
                hasError: false,
                errorMessage: null,
                validationErrors: []
            })
        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        })

};

exports.postEditProduct = (req, res, next) => {
    const title = req.body.title;
    const image = req.file;
    const price = req.body.price;
    const description = req.body.description;
    const id = req.body.productId;


    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render('admin/edit-product', {
            product: {
                title,
                price,
                description,
                _id: id
            },
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editing: true,
            hasError: true,
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        })
    }

    Product.findById(id)
        .then((product) => {
            if (!product) {
                return res.redirect('/');
            }
            if (product.userId.toString() !== req.user._id.toString()) {
                return res.redirect('/');
            }
            product.title = title;
            if (image) {
                fileHelper.deleteFile(product.imageUrl);
                product.imageUrl = image.path;
            }
            product.price = price;
            product.description = description;

            return product.save().then(() => {
                res.redirect('/admin/products');
            })
        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        })


};

// exports.postDeleteProduct = (req, res, next) => {
//     const id = req.body.productId;
//     Product.findById(id).then(product => {
//             if (!product) {
//                 return next(new Error('product not found'))
//             }
//             fileHelper.deleteFile(product.imageUrl);
//             // Product.findByIdAndRemove(id)
//             return Product.findByIdAndRemove({
//                 _id: id,
//                 userId: req.user._id
//             })
//         })
//         .then(result => {
//             // req.user.deleteItemFromCart(id)
//             res.redirect('/admin/products');
//         })
//         .catch(err => {
//             const error = new Error(err)
//             error.httpStatusCode = 500;
//             return next(error);
//         });
// };

exports.deleteProduct = (req, res, next) => {
    // const id = req.body.productId;
    const id = req.params.productId;

    Product.findById(id).then(product => {
            if (!product) {
                return next(new Error('product not found'))
            }
            fileHelper.deleteFile(product.imageUrl);
            return Product.findByIdAndRemove({
                _id: id,
                userId: req.user._id
            })
        })
        .then(result => {
            // req.user.deleteItemFromCart(id)
            // res.redirect('/admin/products');
            res.status(200).json({
                message: 'Success!'
            });
        })
        .catch(err => {
            // const error = new Error(err)
            // error.httpStatusCode = 500;
            // return next(error);
            res.status(500).json({
                message: 'Deleting product failed.'
            });
        });
};

/*****************/