const express = require('express');
const router = express.Router();
/***********************************************************/
const shopController = require('../controllers/shop');
/***********************************************************/
const isAuth = require('../middleware/is-auth.js');
/***********************************************************/

router.get('/', shopController.getIndex);
router.get('/products', shopController.getProducts);
router.get('/products/:productId', shopController.getProduct);

router.get('/cart', isAuth, shopController.getCart);
router.post('/cart', isAuth, shopController.postCart);
router.post('/cart-delete-item', isAuth, shopController.postCartDeleteProduct);

router.get('/orders', isAuth, shopController.getOrders);

//because of stripe have own form and we can't make csrf in this form so we put before csrf middleware
// router.post('/create-order', isAuth, shopController.postOrder);

router.get('/orders/:orderId', isAuth, shopController.getInvoice);

router.get('/checkout', isAuth, shopController.getCheckout);

/***********************************************************/
module.exports = router;