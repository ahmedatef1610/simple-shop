const express = require('express');
const router = express.Router();
/***********************************************************/
const adminController = require('../controllers/admin');
/***********************************************************/
const isAuth = require('../middleware/is-auth.js');
/***********************************************************/
const {
    body
} = require('express-validator/check');
/***********************************************************/

router.get('/add-product', isAuth, adminController.getAddProducts);
router.post('/add-product', isAuth, [
    body('title').isLength({min:1}).isString().trim(),
    body('price').isFloat(),
    body('description').isLength({min:5,max:400}).trim()
], adminController.postAddProducts)

router.get('/products', isAuth, adminController.getProducts);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct)
router.post('/edit-product', isAuth, [
    body('title').isString().trim(),
    body('price').isFloat().trim(),
    body('description').isLength({min:5,max:400}).trim()
], adminController.postEditProduct)

//router.post('/delete-product', isAuth, adminController.postDeleteProduct);

router.delete('/product/:productId', isAuth, adminController.deleteProduct);

/***********************************************************/
module.exports = router;