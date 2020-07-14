const Product = require('../models/product');
const Order = require('../models/order');
const fs = require('fs');
const path = require('path');
const pdfDocument = require('pdfkit');
const ITEMS_PER_PAGE = 4;

const stripe = require('stripe')('sk_test_tm5jd4IYASIRKsKi9LnE0iqq00yqqgpthH');
/*****************/
exports.getIndex = (req, res, next) => {
    res.render('shop/index', {
        pageTitle: 'Shop',
        path: '/',
    });
};

exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;

    Product.find()
        .countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE)
        }).then(products => {
            res.render('shop/product-list', {
                prods: products,
                pageTitle: 'Products',
                path: '/products',
                totalProducts: totalItems,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                previousPage: page - 1,
                currentPage: page,
                nextPage: page + 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)

            });

        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        })
};

exports.getProduct = (req, res, next) => {
    const productId = req.params.productId;

    Product.findById(productId)
        .then((product) => {
            if (!product) {
                res.redirect('/products');
            }
            res.render('shop/product-detail', {
                product: product,
                pageTitle: product.title,
                path: '/products',

            })
        })
        .catch((err) => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        })
};


exports.getCart = (req, res, next) => {

    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items;
            res.render('shop/cart', {
                pageTitle: 'Cart',
                path: '/cart',
                products: products,
                totalPrice: 0,

            });
        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        })

};

exports.postCart = (req, res, next) => {
    const productId = req.body.productId;

    Product.findById(productId)
        .then((product) => {
            if (!product) {
                return res.redirect('/');
            }
            return req.user.addToCart(product)
        })
        .then(result => {
            res.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        })
};

exports.postCartDeleteProduct = (req, res, next) => {
    const productId = req.body.productId;

    req.user.deleteItemFromCart(productId)
        .then(() => {
            res.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getOrders = (req, res, next) => {
    Order.find({
            'user.userId': req.user._id
        })
        .then(orders => {
            res.render('shop/orders', {
                orders,
                pageTitle: 'Orders',
                path: '/orders',

            });
        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        })
};

exports.postOrder = (req, res, next) => {
    
    // Token is created using Checkout or Elements!
    // Get the payment token ID submitted by the form:
    const token = req.body.stripeToken; // Using Express
    let totalSum = 0;

    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            user.cart.items.forEach(p => {
                totalSum += p.quantity * p.productId.price;
            });

            const products = user.cart.items.map(i => {
                return {
                    product: {
                        ...i.productId
                    },
                    quantity: i.quantity
                }
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user
                },
                products: products
            });
            return order.save()
        })
        .then((result) => {

            const charge = stripe.charges.create({
                amount: totalSum * 100,
                currency: 'usd',
                description: 'Demo Order',
                source: token,
                metadata: { //extra data
                    order_id: result._id.toString()
                }
            });

            req.user.clearCart();
        })
        .then((result) => {
            res.redirect('/orders')
        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        })
};

exports.getInvoice = (req, res, next) => {

    const orderId = req.params.orderId;

    Order.findById(orderId)
        .then(order => {
            if (!order) {
                return next(new Error('no order found.'));
            }
            if (order.user.userId.toString() !== req.user._id.toString()) {
                return next(new Error('Unauthorized'));
            }
            const invoiceName = 'invoice-' + orderId + '.pdf';
            const invoicePath = path.join('data', 'invoices', invoiceName);

            //#3
            const pdfDoc = new pdfDocument();
            pdfDoc.pipe(fs.createWriteStream(invoicePath));
            res.setHeader('Content-Type', 'application/pdf');
            pdfDoc.pipe(res);
            pdfDoc.fontSize(26).text('Invoice', {
                underline: true
            });
            pdfDoc.text('-----------------------------------------------------');
            let totalPrice = 0;
            order.products.forEach(prod => {
                totalPrice += prod.quantity * prod.product.price;
                pdfDoc.fontSize(16).text(`${prod.product.title} - ${prod.quantity} items - $${prod.product.price}`);
            });
            pdfDoc.fontSize(21).text('-----------------------');
            pdfDoc.text(`Total Price : $${totalPrice}`);
            pdfDoc.end();

            //#1
            // fs.readFile(invoicePath, (err, data) => {
            //     if (err) {
            //         return next(err);
            //     }
            // res.setHeader('Content-Type', 'application/pdf');
            // res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
            //res.setHeader('Content-Disposition', 'attachment; filename="' + invoiceName + '"');
            //     res.send(data);
            // });

            //#2
            // const file = fs.createReadStream(invoicePath);
            // res.setHeader('Content-Type', 'application/pdf');
            // file.pipe(res);

        })
        .catch(err => {
            next(err)
        })


};

exports.getCheckout = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items;
            let total = 0;
            products.forEach(p => {
                total += p.quantity * p.productId.price;
            })
            res.render('shop/checkout', {
                pageTitle: 'Checkout',
                path: '/checkout',
                products: products,
                totalSum: total,
            });
        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error);
        })
};
/*****************/